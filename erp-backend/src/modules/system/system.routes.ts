import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';
import { validateUploadedFile, sanitizeFileName } from '../../utils/file-upload';

const system = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// Serve logo (Public route so browser <img> tags can render it directly)
system.get('/settings/logo/:institutionId', async (c) => {
  const institutionId = c.req.param('institutionId');
  const key = `logos/${institutionId}`;
  try {
    const file = await c.env.FILES.get(key);
    if (!file) {
      return c.json({ error: 'Logo not found' }, 404);
    }
    const headers = new Headers();
    headers.set('Content-Type', file.httpMetadata?.contentType || 'image/png');
    return new Response(file.body, { headers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

system.use('*', authMiddleware);

// --- CSV HELPER PARSER ---
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip double quote escape
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\r' || char === '\n') {
        row.push(cell.trim());
        cell = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.some(c => c !== '')) {
      result.push(row);
    }
  }

  return result;
}

// --- SYSTEM SETTINGS ---
system.get('/settings', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  
  const settings = await db.prepare(`
    SELECT id, name, address, phone, email, logo, current_academic_year_id, attendance_threshold, passing_marks
    FROM institutions
    WHERE id = ? AND is_active = 1
  `).bind(user.institution_id).first<any>();

  if (!settings) {
    return c.json({ error: 'Institution settings not found' }, 404);
  }

  return c.json(settings);
});

system.post('/settings', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const input = await c.req.json();

  const existing = await db.prepare('SELECT 1 FROM institutions WHERE id = ? AND is_active = 1').bind(user.institution_id).first();
  if (!existing) {
    return c.json({ error: 'Institution not found' }, 404);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.address !== undefined) {
    updates.push('address = ?');
    values.push(input.address);
  }
  if (input.phone !== undefined) {
    updates.push('phone = ?');
    values.push(input.phone);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.logo !== undefined) {
    updates.push('logo = ?');
    values.push(input.logo);
  }
  if (input.current_academic_year_id !== undefined) {
    updates.push('current_academic_year_id = ?');
    values.push(input.current_academic_year_id);
  }
  if (input.attendance_threshold !== undefined) {
    updates.push('attendance_threshold = ?');
    values.push(parseFloat(input.attendance_threshold) || 75.0);
  }
  if (input.passing_marks !== undefined) {
    updates.push('passing_marks = ?');
    values.push(parseFloat(input.passing_marks) || 40.0);
  }

  if (updates.length > 0) {
    values.push(user.sub, user.institution_id);
    await db.prepare(`
      UPDATE institutions
      SET ${updates.join(', ')}, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).bind(...values).run();

    await createAuditLog(c.env.DB, user.sub, 'UPDATE_SYSTEM_SETTINGS', 'system', user.institution_id, `Updated system configurations`);
  }

  return (c.json({ success: true }));
});

system.post('/settings/logo', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No image file provided' }, 400);
  }

  const validationError = validateUploadedFile(file, { photoOnly: true });
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  try {
    const bytes = await file.arrayBuffer();
    const key = `logos/${user.institution_id}`;
    await c.env.FILES.put(key, bytes, {
      httpMetadata: { contentType: file.type || 'image/png' }
    });

    const logoUrl = `/system/settings/logo/${user.institution_id}`;
    await c.env.DB.prepare('UPDATE institutions SET logo = ? WHERE id = ?').bind(logoUrl, user.institution_id).run();
    await createAuditLog(c.env.DB, user.sub, 'UPDATE_INSTITUTION_LOGO', 'system', user.institution_id, `Updated institution logo`);

    return c.json({ success: true, url: logoUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// --- BULK IMPORTS ---
system.post('/imports/students', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file uploaded' }, 400);
  }

  const validationError = validateUploadedFile(file);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) {
    return c.json({ error: 'CSV file is empty or has no data' }, 400);
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  const idxAdmission = headers.indexOf('admission_number');
  const idxFirstName = headers.indexOf('first_name');
  const idxLastName = headers.indexOf('last_name');
  const idxGender = headers.indexOf('gender');
  const idxDob = headers.indexOf('date_of_birth');
  const idxEmail = headers.indexOf('email');
  const idxPhone = headers.indexOf('phone');
  const idxRoll = headers.indexOf('roll_number');

  if (idxAdmission === -1 || idxFirstName === -1 || idxLastName === -1) {
    return c.json({ error: 'Missing required columns: admission_number, first_name, last_name' }, 400);
  }

  const db = c.env.DB;
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const { hashPassword } = await import('../../utils/password');
  const defaultHash = await hashPassword('Student@123');

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const admission = row[idxAdmission];
    const firstName = row[idxFirstName];
    const lastName = row[idxLastName];

    if (!admission || !firstName || !lastName) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Missing required fields`);
      continue;
    }

    const existing = await db.prepare('SELECT id FROM students WHERE admission_number = ? AND institution_id = ?').bind(admission, user.institution_id).first();
    if (existing) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Student with admission number ${admission} already exists`);
      continue;
    }

    const email = idxEmail !== -1 ? row[idxEmail] : null;
    const phone = idxPhone !== -1 ? row[idxPhone] : null;
    const gender = idxGender !== -1 ? row[idxGender] : null;
    const dob = idxDob !== -1 ? row[idxDob] : null;
    const roll = idxRoll !== -1 ? row[idxRoll] : null;

    try {
      let linkedUserId = null;
      if (email) {
        const userExists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!userExists) {
          linkedUserId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO users (id, institution_id, username, email, password_hash, name, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            linkedUserId,
            user.institution_id,
            admission,
            email,
            defaultHash,
            `${firstName} ${lastName}`,
            phone
          ).run();

          const studentRole = await db.prepare("SELECT id FROM roles WHERE name = 'Student'").first<{ id: string }>();
          if (studentRole) {
            await db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').bind(linkedUserId, studentRole.id).run();
          }
        } else {
          linkedUserId = userExists.id;
        }
      }

      const studentId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO students (id, institution_id, user_id, admission_number, roll_number, first_name, last_name, gender, date_of_birth, email, phone, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).bind(
        studentId,
        user.institution_id,
        linkedUserId,
        admission,
        roll,
        firstName,
        lastName,
        gender,
        dob,
        email,
        phone,
        user.sub,
        user.sub
      ).run();

      importedCount++;
    } catch (err: any) {
      skippedCount++;
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'BULK_IMPORT_STUDENTS', 'students', user.institution_id, `Bulk imported ${importedCount} students, skipped ${skippedCount}`);

  return c.json({ success: true, imported: importedCount, skipped: skippedCount, errors });
});

system.post('/imports/teachers', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file uploaded' }, 400);
  }

  const validationError = validateUploadedFile(file);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) {
    return c.json({ error: 'CSV file is empty or has no data' }, 400);
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  const idxEmpId = headers.indexOf('employee_id');
  const idxFirstName = headers.indexOf('first_name');
  const idxLastName = headers.indexOf('last_name');
  const idxEmail = headers.indexOf('email');
  const idxPhone = headers.indexOf('phone');
  const idxJoining = headers.indexOf('joining_date');
  const idxDesg = headers.indexOf('designation');
  const idxDept = headers.indexOf('department');

  if (idxEmpId === -1 || idxFirstName === -1 || idxLastName === -1) {
    return c.json({ error: 'Missing required columns: employee_id, first_name, last_name' }, 400);
  }

  const db = c.env.DB;
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const { hashPassword } = await import('../../utils/password');
  const defaultHash = await hashPassword('Teacher@123');

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const empId = row[idxEmpId];
    const firstName = row[idxFirstName];
    const lastName = row[idxLastName];

    if (!empId || !firstName || !lastName) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Missing required fields`);
      continue;
    }

    const existing = await db.prepare('SELECT id FROM teachers WHERE employee_id = ? AND institution_id = ?').bind(empId, user.institution_id).first();
    if (existing) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Teacher with employee ID ${empId} already exists`);
      continue;
    }

    const email = idxEmail !== -1 ? row[idxEmail] : null;
    const phone = idxPhone !== -1 ? row[idxPhone] : null;
    const joining = idxJoining !== -1 ? row[idxJoining] : null;
    const desg = idxDesg !== -1 ? row[idxDesg] : null;
    const dept = idxDept !== -1 ? row[idxDept] : null;

    try {
      let linkedUserId = null;
      if (email) {
        const userExists = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (!userExists) {
          linkedUserId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO users (id, institution_id, username, email, password_hash, name, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            linkedUserId,
            user.institution_id,
            empId,
            email,
            defaultHash,
            `${firstName} ${lastName}`,
            phone
          ).run();

          const teacherRole = await db.prepare("SELECT id FROM roles WHERE name = 'Teacher'").first<{ id: string }>();
          if (teacherRole) {
            await db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').bind(linkedUserId, teacherRole.id).run();
          }
        } else {
          linkedUserId = userExists.id;
        }
      }

      const teacherId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO teachers (id, institution_id, user_id, employee_id, first_name, last_name, email, phone, joining_date, designation, department, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).bind(
        teacherId,
        user.institution_id,
        linkedUserId,
        empId,
        firstName,
        lastName,
        email,
        phone,
        joining,
        desg,
        dept,
        user.sub,
        user.sub
      ).run();

      importedCount++;
    } catch (err: any) {
      skippedCount++;
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'BULK_IMPORT_TEACHERS', 'teachers', user.institution_id, `Bulk imported ${importedCount} teachers, skipped ${skippedCount}`);

  return c.json({ success: true, imported: importedCount, skipped: skippedCount, errors });
});

system.post('/imports/subjects', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No CSV file uploaded' }, 400);
  }

  const validationError = validateUploadedFile(file);
  if (validationError) {
    return c.json({ error: validationError }, 400);
  }

  const safeName = sanitizeFileName(file.name);

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length < 2) {
    return c.json({ error: 'CSV file is empty or has no data' }, 400);
  }

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  const idxCourseCode = headers.indexOf('course_code');
  const idxSubCode = headers.indexOf('subject_code');
  const idxSubName = headers.indexOf('subject_name');
  const idxCredits = headers.indexOf('credits');
  const idxSemester = headers.indexOf('semester');

  if (idxCourseCode === -1 || idxSubCode === -1 || idxSubName === -1) {
    return c.json({ error: 'Missing required columns: course_code, subject_code, subject_name' }, 400);
  }

  const db = c.env.DB;
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const courseCache = new Map<string, string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const courseCode = row[idxCourseCode];
    const subjectCode = row[idxSubCode];
    const subjectName = row[idxSubName];

    if (!courseCode || !subjectCode || !subjectName) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Missing required fields`);
      continue;
    }

    let courseId = courseCache.get(courseCode);
    if (!courseId) {
      const course = await db.prepare('SELECT id FROM courses WHERE course_code = ? AND institution_id = ? AND is_active = 1').bind(courseCode, user.institution_id).first<{ id: string }>();
      if (!course) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Course with code ${courseCode} not found in database`);
        continue;
      }
      courseId = course.id;
      courseCache.set(courseCode, courseId);
    }

    const existing = await db.prepare('SELECT id FROM subjects WHERE subject_code = ? AND institution_id = ? AND is_active = 1').bind(subjectCode, user.institution_id).first();
    if (existing) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Subject with code ${subjectCode} already exists`);
      continue;
    }

    const credits = idxCredits !== -1 ? parseInt(row[idxCredits]) || 4 : 4;
    const semester = idxSemester !== -1 ? parseInt(row[idxSemester]) || 1 : 1;

    try {
      const subjectId = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO subjects (id, institution_id, course_id, subject_code, subject_name, credits, semester, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        subjectId,
        user.institution_id,
        courseId,
        subjectCode,
        subjectName,
        credits,
        semester,
        user.sub,
        user.sub
      ).run();

      importedCount++;
    } catch (err: any) {
      skippedCount++;
      errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  await createAuditLog(c.env.DB, user.sub, 'BULK_IMPORT_SUBJECTS', 'subjects', user.institution_id, `Bulk imported ${importedCount} subjects, skipped ${skippedCount}`);

  return c.json({ success: true, imported: importedCount, skipped: skippedCount, errors });
});

// --- DATABASE BACKUP / EXPORT ---
system.get('/backup/export', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const tables = [
    'institutions', 'users', 'roles', 'user_roles', 'permissions', 'role_permissions',
    'academic_years', 'departments', 'courses', 'sections', 'subjects',
    'teachers', 'students', 'guardians', 'academic_calendar', 'timetable_slots',
    'weekly_timetable', 'attendance_sessions', 'student_attendance', 'student_enrollments',
    'exams', 'exam_subjects', 'student_marks', 'teacher_attendance', 'announcements',
    'notifications', 'fee_structures', 'student_fee_records', 'fee_payments', 'fee_receipts'
  ];

  const sqlLines: string[] = [];
  sqlLines.push(`-- College ERP Backup SQL Dump`);
  sqlLines.push(`-- Institution ID: ${user.institution_id}`);
  sqlLines.push(`-- Exported At: ${new Date().toISOString()}`);
  sqlLines.push(`PRAGMA foreign_keys=OFF;`);
  sqlLines.push(`BEGIN TRANSACTION;`);

  for (const table of tables) {
    let selectQuery = `SELECT * FROM ${table}`;
    if (['institutions'].includes(table)) {
      selectQuery = `SELECT * FROM ${table} WHERE id = '${user.institution_id}'`;
    } else if (['users', 'academic_years', 'departments', 'courses', 'sections', 'subjects', 'teachers', 'students', 'academic_calendar', 'timetable_slots', 'weekly_timetable', 'attendance_sessions', 'student_attendance', 'teacher_attendance', 'announcements', 'notifications', 'fee_structures', 'student_fee_records', 'fee_payments', 'fee_receipts', 'exams', 'exam_subjects', 'student_marks'].includes(table)) {
      selectQuery = `SELECT * FROM ${table} WHERE institution_id = '${user.institution_id}'`;
    } else if (table === 'guardians') {
      selectQuery = `SELECT g.* FROM guardians g JOIN students s ON g.student_id = s.id WHERE s.institution_id = '${user.institution_id}'`;
    } else if (table === 'student_enrollments') {
      selectQuery = `SELECT se.* FROM student_enrollments se JOIN students s ON se.student_id = s.id WHERE s.institution_id = '${user.institution_id}'`;
    } else if (table === 'user_roles') {
      selectQuery = `SELECT ur.* FROM user_roles ur JOIN users u ON ur.user_id = u.id WHERE u.institution_id = '${user.institution_id}'`;
    }
    
    try {
      const { results } = await db.prepare(selectQuery).all<any>();
      if (results && results.length > 0) {
        sqlLines.push(`\n-- Dumping data for table ${table}`);
        
        let deleteQuery = `DELETE FROM ${table};`;
        if (['institutions'].includes(table)) {
          deleteQuery = `DELETE FROM ${table} WHERE id = '${user.institution_id}';`;
        } else if (['users', 'academic_years', 'departments', 'courses', 'sections', 'subjects', 'teachers', 'students', 'academic_calendar', 'timetable_slots', 'weekly_timetable', 'attendance_sessions', 'student_attendance', 'teacher_attendance', 'announcements', 'notifications', 'fee_structures', 'student_fee_records', 'fee_payments', 'fee_receipts', 'exams', 'exam_subjects', 'student_marks'].includes(table)) {
          deleteQuery = `DELETE FROM ${table} WHERE institution_id = '${user.institution_id}';`;
        } else if (table === 'guardians') {
          deleteQuery = `DELETE FROM guardians WHERE student_id IN (SELECT id FROM students WHERE institution_id = '${user.institution_id}');`;
        } else if (table === 'student_enrollments') {
          deleteQuery = `DELETE FROM student_enrollments WHERE student_id IN (SELECT id FROM students WHERE institution_id = '${user.institution_id}');`;
        } else if (table === 'user_roles') {
          deleteQuery = `DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE institution_id = '${user.institution_id}');`;
        } else if (['roles', 'permissions', 'role_permissions'].includes(table)) {
          deleteQuery = '';
        }
        
        if (deleteQuery) {
          sqlLines.push(deleteQuery);
        }

        for (const row of results) {
          const colNames = Object.keys(row).join(', ');
          const colValues = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return String(val);
            return `'${String(val).replace(/'/g, "''")}'`;
          }).join(', ');
          
          const insertVerb = ['roles', 'permissions', 'role_permissions'].includes(table) ? 'INSERT OR IGNORE' : 'INSERT';
          sqlLines.push(`${insertVerb} INTO ${table} (${colNames}) VALUES (${colValues});`);
        }
      }
    } catch (e: any) {
      sqlLines.push(`-- Failed to dump table ${table}: ${e.message}`);
    }
  }

  sqlLines.push(`\nCOMMIT;`);
  sqlLines.push(`PRAGMA foreign_keys=ON;`);

  const dumpText = sqlLines.join('\n');
  
  await createAuditLog(c.env.DB, user.sub, 'EXPORT_DATABASE_BACKUP', 'system', user.institution_id, `Database data backup exported`);

  return new Response(dumpText, {
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="erp_backup_${user.institution_id}_${Date.now()}.sql"`
    }
  });
});

// --- DATABASE BACKUP / RESTORE ---
system.post('/backup/restore', requireRole('admin', 'super_admin', 'Principal'), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No SQL file uploaded' }, 400);
  }

  const sqlText = await file.text();
  
  // Tenant security checks: Make sure the Institution ID matches!
  const matchInstLine = sqlText.match(/-- Institution ID:\s*(\S+)/);
  if (!matchInstLine) {
    return c.json({ error: 'Invalid backup file format: missing institution identity' }, 400);
  }

  const backupInstId = matchInstLine[1];
  if (backupInstId !== user.institution_id) {
    return c.json({ error: 'Unauthorized: Cannot restore a backup belonging to another institution' }, 403);
  }

  const db = c.env.DB;
  try {
    await db.exec(sqlText);
    await createAuditLog(c.env.DB, user.sub, 'RESTORE_DATABASE_BACKUP', 'system', user.institution_id, `Database data backup restored successfully`);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: `Restore failed: ${err.message}` }, 500);
  }
});

// --- VAPID KEY GENERATION (run once, save to .dev.vars / wrangler secrets) ---
system.get('/vapid-keys', requireRole('admin', 'super_admin'), async (c) => {
  // Generate an EC P-256 key pair for VAPID
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);

  const toBase64Url = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return c.json({
    publicKey: toBase64Url(publicKey),
    privateKey: toBase64Url(privateKey),
    instructions: 'Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your .dev.vars and wrangler secrets'
  });
});

export default system;
