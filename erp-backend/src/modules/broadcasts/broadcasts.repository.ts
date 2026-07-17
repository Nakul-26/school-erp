import { Broadcast, CreateBroadcastInput, UpdateBroadcastInput, BroadcastRecipient, BroadcastAttachment, RecipientFilter } from './broadcasts.types';

export class BroadcastsRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, createdBy: string, input: CreateBroadcastInput): Promise<void> {
    await this.db.prepare(`
      INSERT INTO broadcasts (
        id, institution_id, created_by, subject, body, category, priority,
        recipient_type, recipient_filter, channel, status, expires_at, scheduled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      createdBy,
      input.subject,
      input.body,
      input.category || 'general',
      input.priority || 'normal',
      input.recipient_type,
      input.recipient_filter,
      input.channel || 'erp',
      input.status || 'draft',
      input.expires_at || null,
      input.scheduled_at || null
    ).run();
  }

  async findById(id: string): Promise<Broadcast | null> {
    return await this.db.prepare('SELECT * FROM broadcasts WHERE id = ? AND is_active = 1').bind(id).first<Broadcast>();
  }

  async update(id: string, input: UpdateBroadcastInput): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    const fieldMapping: Record<string, string> = {
      subject: 'subject',
      body: 'body',
      category: 'category',
      priority: 'priority',
      recipient_type: 'recipient_type',
      recipient_filter: 'recipient_filter',
      channel: 'channel',
      status: 'status',
      expires_at: 'expires_at',
      scheduled_at: 'scheduled_at',
      sent_at: 'sent_at',
      total_recipients: 'total_recipients',
      delivered_count: 'delivered_count',
      read_count: 'read_count',
      is_active: 'is_active'
    };

    for (const [key, dbCol] of Object.entries(fieldMapping)) {
      if (input[key as keyof UpdateBroadcastInput] !== undefined) {
        updates.push(`${dbCol} = ?`);
        values.push(input[key as keyof UpdateBroadcastInput]);
      }
    }

    if (updates.length === 0) return;

    values.push(id);

    await this.db.prepare(`
      UPDATE broadcasts
      SET ${updates.join(', ')}, updated_at = datetime('now')
      WHERE id = ? AND is_active = 1
    `).bind(...values).run();
  }

  async listAll(institutionId: string, filters: { status?: string; category?: string; createdBy?: string } = {}): Promise<Broadcast[]> {
    let query = 'SELECT * FROM broadcasts WHERE institution_id = ? AND is_active = 1';
    const params: any[] = [institutionId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category && filters.category !== 'All') {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.createdBy) {
      query += ' AND created_by = ?';
      params.push(filters.createdBy);
    }

    query += ' ORDER BY created_at DESC';
    const { results } = await this.db.prepare(query).bind(...params).all<Broadcast>();
    return results || [];
  }

  // Attachments
  async getAttachments(broadcastId: string): Promise<BroadcastAttachment[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM broadcast_attachments WHERE broadcast_id = ? ORDER BY created_at ASC'
    ).bind(broadcastId).all<BroadcastAttachment>();
    return results || [];
  }

  async createAttachments(broadcastId: string, attachments: any[]): Promise<void> {
    if (attachments.length === 0) return;
    const statements = attachments.map(att => {
      const id = crypto.randomUUID();
      return this.db.prepare(`
        INSERT INTO broadcast_attachments (id, broadcast_id, file_name, file_url, mime_type, size_bytes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(id, broadcastId, att.file_name, att.file_url, att.mime_type || null, att.size_bytes || null);
    });
    await this.db.batch(statements);
  }

  async deleteAttachments(broadcastId: string): Promise<void> {
    await this.db.prepare('DELETE FROM broadcast_attachments WHERE broadcast_id = ?').bind(broadcastId).run();
  }

  // Recipients
  async addRecipients(recipients: { id: string; broadcast_id: string; user_id: string }[]): Promise<void> {
    if (recipients.length === 0) return;
    
    // Cloudflare D1 batch supports up to 100 statements at once. Let's chunk the inputs.
    const chunkSize = 80;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const statements = chunk.map(r => {
        return this.db.prepare(`
          INSERT OR IGNORE INTO broadcast_recipients (id, broadcast_id, user_id, is_read, read_at)
          VALUES (?, ?, ?, 0, NULL)
        `).bind(r.id, r.broadcast_id, r.user_id);
      });
      await this.db.batch(statements);
    }
  }

  // List received broadcasts for a user
  async listReceivedBroadcasts(userId: string, institutionId: string, category?: string): Promise<any[]> {
    let query = `
      SELECT b.*, br.is_read, br.read_at, br.delivered_at
      FROM broadcast_recipients br
      JOIN broadcasts b ON br.broadcast_id = b.id
      WHERE br.user_id = ? AND b.institution_id = ? AND b.status = 'sent' AND b.is_active = 1
    `;
    const params: any[] = [userId, institutionId];

    if (category && category !== 'All') {
      query += ' AND b.category = ?';
      params.push(category);
    }

    query += ' ORDER BY b.sent_at DESC';

    const { results } = await this.db.prepare(query).bind(...params).all();
    return results || [];
  }

  async markAsRead(broadcastId: string, userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE broadcast_recipients
      SET is_read = 1, read_at = datetime('now')
      WHERE broadcast_id = ? AND user_id = ? AND is_read = 0
    `).bind(broadcastId, userId).run();

    // Increment read count in broadcasts table
    await this.db.prepare(`
      UPDATE broadcasts
      SET read_count = read_count + 1
      WHERE id = ?
    `).bind(broadcastId).run();
  }

  async getRecipientAnalytics(broadcastId: string): Promise<any[]> {
    const { results } = await this.db.prepare(`
      SELECT br.id, br.broadcast_id, br.user_id, br.is_read, br.read_at, br.delivered_at,
             u.name, u.email,
             (SELECT GROUP_CONCAT(r.name) FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id) as roles
      FROM broadcast_recipients br
      JOIN users u ON br.user_id = u.id
      WHERE br.broadcast_id = ?
      ORDER BY u.name ASC
    `).bind(broadcastId).all();
    return results || [];
  }

  // User Resolution Queries
  async resolveStudentsBySections(sectionIds: string[], institutionId: string): Promise<string[]> {
    if (sectionIds.length === 0) return [];
    const placeholders = sectionIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT s.user_id FROM students s
      JOIN student_enrollments se ON se.student_id = s.id
      WHERE se.section_id IN (${placeholders}) AND s.institution_id = ? AND s.is_active = 1 AND se.is_active = 1 AND s.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...sectionIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveStudentsByClasses(classIds: string[], institutionId: string): Promise<string[]> {
    if (classIds.length === 0) return [];
    const placeholders = classIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT s.user_id FROM students s
      JOIN student_enrollments se ON se.student_id = s.id
      WHERE se.course_id IN (${placeholders}) AND s.institution_id = ? AND s.is_active = 1 AND se.is_active = 1 AND s.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...classIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveStudentsByDepartments(departmentIds: string[], institutionId: string): Promise<string[]> {
    if (departmentIds.length === 0) return [];
    const placeholders = departmentIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT s.user_id FROM students s
      JOIN student_enrollments se ON se.student_id = s.id
      JOIN courses c ON se.course_id = c.id
      WHERE c.department_id IN (${placeholders}) AND s.institution_id = ? AND s.is_active = 1 AND se.is_active = 1 AND s.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...departmentIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveParentsBySections(sectionIds: string[], institutionId: string): Promise<string[]> {
    if (sectionIds.length === 0) return [];
    const placeholders = sectionIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT g.user_id FROM guardians g
      JOIN students s ON g.student_id = s.id
      JOIN student_enrollments se ON se.student_id = s.id
      WHERE se.section_id IN (${placeholders}) AND s.institution_id = ? AND g.is_active = 1 AND s.is_active = 1 AND se.is_active = 1 AND g.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...sectionIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveParentsByClasses(classIds: string[], institutionId: string): Promise<string[]> {
    if (classIds.length === 0) return [];
    const placeholders = classIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT g.user_id FROM guardians g
      JOIN students s ON g.student_id = s.id
      JOIN student_enrollments se ON se.student_id = s.id
      WHERE se.course_id IN (${placeholders}) AND s.institution_id = ? AND g.is_active = 1 AND s.is_active = 1 AND se.is_active = 1 AND g.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...classIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveParentsByDepartments(departmentIds: string[], institutionId: string): Promise<string[]> {
    if (departmentIds.length === 0) return [];
    const placeholders = departmentIds.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT g.user_id FROM guardians g
      JOIN students s ON g.student_id = s.id
      JOIN student_enrollments se ON se.student_id = s.id
      JOIN courses c ON se.course_id = c.id
      WHERE c.department_id IN (${placeholders}) AND s.institution_id = ? AND g.is_active = 1 AND s.is_active = 1 AND se.is_active = 1 AND g.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...departmentIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveTeachersBySections(sectionIds: string[], institutionId: string): Promise<string[]> {
    if (sectionIds.length === 0) return [];
    const placeholders = sectionIds.map(() => '?').join(',');
    
    // We get teachers allocated via teaching_allocations, AND section class teachers
    const query = `
      SELECT DISTINCT user_id FROM (
        SELECT DISTINCT t.user_id FROM teachers t
        JOIN teaching_allocations ta ON ta.teacher_id = t.id
        WHERE ta.section_id IN (${placeholders}) AND t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
        UNION
        SELECT DISTINCT t.user_id FROM teachers t
        JOIN sections sec ON sec.class_teacher_id = t.id
        WHERE sec.id IN (${placeholders}) AND t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
      )
    `;
    // Bind sectionIds twice since it's used in UNION query parts
    const bindParams = [...sectionIds, institutionId, ...sectionIds, institutionId];
    const { results } = await this.db.prepare(query).bind(...bindParams).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveTeachersByClasses(classIds: string[], institutionId: string): Promise<string[]> {
    if (classIds.length === 0) return [];
    const placeholders = classIds.map(() => '?').join(',');
    
    const query = `
      SELECT DISTINCT user_id FROM (
        SELECT DISTINCT t.user_id FROM teachers t
        JOIN teaching_allocations ta ON ta.teacher_id = t.id
        JOIN sections sec ON ta.section_id = sec.id
        WHERE sec.course_id IN (${placeholders}) AND t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
        UNION
        SELECT DISTINCT t.user_id FROM teachers t
        JOIN sections sec ON sec.class_teacher_id = t.id
        WHERE sec.course_id IN (${placeholders}) AND t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
      )
    `;
    const bindParams = [...classIds, institutionId, ...classIds, institutionId];
    const { results } = await this.db.prepare(query).bind(...bindParams).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveTeachersByDepartments(departmentIds: string[], institutionId: string): Promise<string[]> {
    if (departmentIds.length === 0) return [];
    const placeholders = departmentIds.map(() => '?').join(',');
    
    const query = `
      SELECT DISTINCT t.user_id FROM teachers t
      JOIN departments d ON t.department = d.code
      WHERE d.id IN (${placeholders}) AND t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(...departmentIds, institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveAllAudienceByRole(roleName: string, institutionId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT u.id FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = ? AND u.institution_id = ? AND u.is_active = 1
    `;
    const { results } = await this.db.prepare(query).bind(roleName, institutionId).all<{ id: string }>();
    return (results || []).map(r => r.id);
  }

  async resolveAllParents(institutionId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT g.user_id FROM guardians g
      JOIN students s ON g.student_id = s.id
      WHERE s.institution_id = ? AND g.is_active = 1 AND g.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveAllTeachers(institutionId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT t.user_id FROM teachers t
      WHERE t.institution_id = ? AND t.is_active = 1 AND t.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async resolveAllStudents(institutionId: string): Promise<string[]> {
    const query = `
      SELECT DISTINCT s.user_id FROM students s
      WHERE s.institution_id = ? AND s.is_active = 1 AND s.user_id IS NOT NULL
    `;
    const { results } = await this.db.prepare(query).bind(institutionId).all<{ user_id: string }>();
    return (results || []).map(r => r.user_id);
  }

  async getContactsByIds(userIds: string[]): Promise<{ id: string; name: string; email: string; phone?: string | null }[]> {
    if (userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    const query = `
      SELECT id, name, email, phone FROM users
      WHERE id IN (${placeholders}) AND is_active = 1
    `;
    const { results } = await this.db.prepare(query).bind(...userIds).all<any>();
    return results || [];
  }

  async findScheduledToDeliver(): Promise<Broadcast[]> {
    const query = `
      SELECT * FROM broadcasts
      WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= datetime('now') AND is_active = 1
    `;
    const { results } = await this.db.prepare(query).all<Broadcast>();
    return results || [];
  }
}
