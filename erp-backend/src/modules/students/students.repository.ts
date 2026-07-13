import { Student, CreateStudentInput, UpdateStudentInput } from './students.types';
import { getUpdateFields } from '../../utils/repository';

const UPDATE_FIELDS = [
  'user_id', 'admission_number', 'roll_number', 'first_name', 'middle_name', 'last_name',
  'gender', 'date_of_birth', 'email', 'phone', 'address', 'photo', 'admission_date', 'status',
  'blood_group', 'emergency_contact', 'medical_notes',
] as const;

export class StudentRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, input: any, userId?: string): Promise<void> {
    // 1. Insert student
    await this.db.prepare(`
      INSERT INTO students (
        id, institution_id, user_id, admission_number, roll_number, 
        first_name, middle_name, last_name, gender, date_of_birth, 
        email, phone, address, photo, admission_date, status, created_by, updated_by,
        blood_group, emergency_contact, medical_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, institutionId, input.user_id || null, input.admission_number, input.roll_number || null,
      input.first_name, input.middle_name || null, input.last_name || '', input.gender || null, input.date_of_birth || null,
      input.email || null, input.phone || null, input.address || null, input.photo || null, input.admission_date || null, input.status || 'ACTIVE', userId || null, userId || null,
      input.blood_group || null, input.emergency_contact || null, input.medical_notes || null
    ).run();

    // 2. Insert enrollment if academic info is provided
    if (input.academic_year_id && input.course_id && input.section_id) {
      const enrollmentId = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO student_enrollments (
          id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        enrollmentId, id, input.academic_year_id, input.course_id, input.section_id, 1, userId || null, userId || null
      ).run();

      // Automatically generate fee records for student if fee structure exists
      try {
        const { results: structures } = await this.db.prepare(`
          SELECT * FROM fee_structures 
          WHERE institution_id = ? AND academic_year_id = ? AND course_id = ? AND year_number = ? AND is_active = 1
        `).bind(institutionId, input.academic_year_id, input.course_id, 1).all<any>();

        if (structures && structures.length > 0) {
          for (const struct of structures) {
            const recordId = crypto.randomUUID();
            await this.db.prepare(`
              INSERT OR IGNORE INTO student_fee_records (
                id, institution_id, student_id, academic_year_id, course_id, year_number, 
                fee_structure_id, fee_type, total_amount, paid_amount, due_date, status, created_by, updated_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'UNPAID', ?, ?)
            `).bind(
              recordId, institutionId, id, input.academic_year_id, input.course_id, 1,
              struct.id, struct.fee_type, struct.amount, null, userId || null, userId || null
            ).run();
          }
        }
      } catch (err) {
        console.error('Failed to auto-generate fee records:', err);
      }
    }

    // 3. Insert guardians
    if (input.guardians && Array.isArray(input.guardians) && input.guardians.length > 0) {
      for (const g of input.guardians) {
        if (!g.name) continue;
        const guardianId = crypto.randomUUID();
        await this.db.prepare(`
          INSERT INTO guardians (
            id, student_id, name, relationship, phone, email, is_active, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          guardianId, id, g.name, g.relationship || 'Parent', 
          g.phone || null, g.email || null, userId || null, userId || null
        ).run();
      }
    } else if (input.guardian_name) {
      const guardianId = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO guardians (
          id, student_id, name, relationship, phone, email, is_active, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        guardianId, id, input.guardian_name, input.guardian_relationship || 'Parent', 
        input.guardian_phone || null, input.guardian_email || null, userId || null, userId || null
      ).run();
    }
  }

  async findById(id: string): Promise<any | null> {
    const student = await this.db.prepare(`
      SELECT 
        s.*,
        se.academic_year_id,
        se.course_id,
        se.section_id,
        se.semester,
        c.name AS program_name,
        c.course_code AS program_code,
        sec.name AS section_name,
        ay.name AS academic_year_name,
        (
          SELECT CASE 
            WHEN COUNT(status) > 0 THEN ROUND(100.0 * COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(status), 0)
            ELSE 100 
          END
          FROM student_attendance 
          WHERE student_id = s.id AND is_active = 1
        ) AS attendance_percentage,
        (
          SELECT COALESCE(SUM(total_amount - paid_amount), 0) 
          FROM student_fee_records 
          WHERE student_id = s.id AND is_active = 1
        ) AS fee_due
      FROM students s
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN courses c ON c.id = se.course_id AND c.is_active = 1
      LEFT JOIN sections sec ON sec.id = se.section_id AND sec.is_active = 1
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.is_active = 1
      WHERE s.id = ? AND s.is_active = 1
    `).bind(id).first<any>();

    if (student) {
      const { results: guardians } = await this.db.prepare(`
        SELECT id, name, relationship, phone, email, occupation
        FROM guardians
        WHERE student_id = ? AND is_active = 1
        ORDER BY created_at ASC
      `).bind(id).all<any>();
      student.guardians = guardians || [];

      // Backward compatibility fields
      if (guardians && guardians.length > 0) {
        student.guardian_name = guardians[0].name;
        student.guardian_relationship = guardians[0].relationship;
        student.guardian_phone = guardians[0].phone;
        student.guardian_email = guardians[0].email;
      } else {
        student.guardian_name = null;
        student.guardian_relationship = null;
        student.guardian_phone = null;
        student.guardian_email = null;
      }
    }

    return student;
  }

  async listByInstitution(
    institutionId: string,
    filters?: {
      search?: string;
      program_id?: string;
      section_id?: string;
      academic_year_id?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ students: any[]; total: number }> {
    let whereClause = 'WHERE s.institution_id = ? AND s.is_active = 1';
    const params: any[] = [institutionId];

    if (filters) {
      if (filters.status) {
        whereClause += ` AND s.status = ?`;
        params.push(filters.status);
      }
      if (filters.academic_year_id) {
        whereClause += ` AND se.academic_year_id = ?`;
        params.push(filters.academic_year_id);
      }
      if (filters.program_id) {
        whereClause += ` AND se.course_id = ?`;
        params.push(filters.program_id);
      }
      if (filters.section_id) {
        whereClause += ` AND se.section_id = ?`;
        params.push(filters.section_id);
      }
      if (filters.search) {
        whereClause += ` AND (
          s.first_name LIKE ? 
          OR s.last_name LIKE ? 
          OR s.admission_number LIKE ? 
          OR (s.roll_number IS NOT NULL AND s.roll_number LIKE ?)
        )`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
    }

    // 1. Get total matching count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as count 
      FROM students s
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      ${whereClause}
    `;
    const countResult = await this.db.prepare(countQuery).bind(...params).first<{ count: number }>();
    const total = countResult?.count || 0;

    // 2. Query actual records
    let selectQuery = `
      SELECT 
        s.*,
        se.academic_year_id,
        se.course_id,
        se.section_id,
        se.semester,
        c.name AS program_name,
        c.course_code AS program_code,
        sec.name AS section_name,
        ay.name AS academic_year_name,
        (
          SELECT CASE 
            WHEN COUNT(status) > 0 THEN ROUND(100.0 * COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(status), 0)
            ELSE 100 
          END
          FROM student_attendance 
          WHERE student_id = s.id AND is_active = 1
        ) AS attendance_percentage,
        (
          SELECT COALESCE(SUM(total_amount - paid_amount), 0) 
          FROM student_fee_records 
          WHERE student_id = s.id AND is_active = 1
        ) AS fee_due,
        g.name AS guardian_name,
        g.relationship AS guardian_relationship,
        g.phone AS guardian_phone,
        g.email AS guardian_email
      FROM students s
      LEFT JOIN student_enrollments se ON se.id = (
        SELECT id FROM student_enrollments 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN courses c ON c.id = se.course_id AND c.is_active = 1
      LEFT JOIN sections sec ON sec.id = se.section_id AND sec.is_active = 1
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id AND ay.is_active = 1
      LEFT JOIN guardians g ON g.id = (
        SELECT id FROM guardians 
        WHERE student_id = s.id AND is_active = 1 
        ORDER BY created_at DESC LIMIT 1
      )
      ${whereClause}
      ORDER BY s.created_at DESC
    `;

    if (filters && typeof filters.limit === 'number') {
      selectQuery += ` LIMIT ?`;
      params.push(filters.limit);
      if (typeof filters.offset === 'number') {
        selectQuery += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const { results } = await this.db.prepare(selectQuery).bind(...params).all<any>();
    return { students: results || [], total };
  }

  async update(id: string, input: any, userId?: string): Promise<void> {
    const fields = getUpdateFields(input, UPDATE_FIELDS);
    if (fields.length > 0) {
      const sets = fields.map(field => `${field} = ?`).join(', ');
      const values = [...fields.map(f => input[f]), userId || null, id];

      await this.db.prepare(`
        UPDATE students 
        SET ${sets}, updated_at = datetime('now'), updated_by = ?
        WHERE id = ? AND is_active = 1
      `).bind(...values).run();
    }

    // 2. Update guardian details
    if (input.guardians && Array.isArray(input.guardians)) {
      await this.db.prepare('DELETE FROM guardians WHERE student_id = ?').bind(id).run();
      for (const g of input.guardians) {
        if (!g.name) continue;
        const guardianId = crypto.randomUUID();
        await this.db.prepare(`
          INSERT INTO guardians (
            id, student_id, name, relationship, phone, email, is_active, created_by, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          guardianId, id, g.name, g.relationship || 'Parent', 
          g.phone || null, g.email || null, userId || null, userId || null
        ).run();
      }
    } else if (input.guardian_name) {
      const hasGuardian = await this.db.prepare('SELECT id FROM guardians WHERE student_id = ? AND is_active = 1').bind(id).first<{ id: string }>();
      if (hasGuardian) {
        await this.db.prepare(`
          UPDATE guardians 
          SET name = ?, relationship = ?, phone = ?, email = ?, updated_at = datetime('now'), updated_by = ?
          WHERE id = ?
        `).bind(
          input.guardian_name, input.guardian_relationship || 'Parent', 
          input.guardian_phone || null, input.guardian_email || null, userId || null, hasGuardian.id
        ).run();
      } else {
        const guardianId = crypto.randomUUID();
        await this.db.prepare(`
          INSERT INTO guardians (id, student_id, name, relationship, phone, email, is_active, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `).bind(
          guardianId, id, input.guardian_name, input.guardian_relationship || 'Parent', 
          input.guardian_phone || null, input.guardian_email || null, userId || null, userId || null
        ).run();
      }
    }

    // 3. Update active enrollment
    if (input.academic_year_id && input.course_id && input.section_id) {
      const activeEnrollment = await this.db.prepare('SELECT id, academic_year_id, semester FROM student_enrollments WHERE student_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1').bind(id).first<{ id: string, academic_year_id: string, semester: number }>();
      if (activeEnrollment) {
        if (activeEnrollment.academic_year_id === input.academic_year_id && activeEnrollment.semester === (input.semester || 1)) {
          await this.db.prepare(`
            UPDATE student_enrollments 
            SET course_id = ?, section_id = ?, updated_at = datetime('now'), updated_by = ? 
            WHERE id = ?
          `).bind(
            input.course_id, input.section_id, userId || null, activeEnrollment.id
          ).run();
        } else {
          const enrollmentId = crypto.randomUUID();
          await this.db.prepare(`
            INSERT INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            enrollmentId, id, input.academic_year_id, input.course_id, input.section_id, input.semester || 1, userId || null, userId || null
          ).run();
        }
      } else {
        const enrollmentId = crypto.randomUUID();
        await this.db.prepare(`
          INSERT INTO student_enrollments (id, student_id, academic_year_id, course_id, section_id, semester, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          enrollmentId, id, input.academic_year_id, input.course_id, input.section_id, input.semester || 1, userId || null, userId || null
        ).run();
      }
    }
  }

  async softDelete(id: string, userId?: string): Promise<void> {
    const stmts = [
      this.db.prepare(`UPDATE students SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE id = ?`).bind(userId || null, id),
      this.db.prepare(`UPDATE student_enrollments SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE student_id = ?`).bind(userId || null, id),
      this.db.prepare(`UPDATE student_fee_records SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE student_id = ?`).bind(userId || null, id),
      this.db.prepare(`UPDATE guardians SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE student_id = ?`).bind(userId || null, id),
      this.db.prepare(`UPDATE student_attendance SET is_active = 0, deleted_at = datetime('now'), updated_by = ? WHERE student_id = ?`).bind(userId || null, id),
      // Deactivate the linked portal user account (if any)
      this.db.prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = (SELECT user_id FROM students WHERE id = ?)`).bind(id),
    ];
    await this.db.batch(stmts);
  }

  async hardDelete(id: string): Promise<void> {
    const stmts = [
      this.db.prepare(`DELETE FROM fee_receipts WHERE payment_id IN (SELECT id FROM fee_payments WHERE student_id = ?)`).bind(id),
      this.db.prepare(`DELETE FROM fee_payments WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM student_fee_records WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM student_marks WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM student_attendance WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM student_enrollments WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM guardians WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM alumni WHERE student_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM notes WHERE entity_type = 'student' AND entity_id = ?`).bind(id),
      this.db.prepare(`DELETE FROM students WHERE id = ?`).bind(id)
    ];
    await this.db.batch(stmts);
  }
}
