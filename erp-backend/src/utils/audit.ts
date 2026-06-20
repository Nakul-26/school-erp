export async function createAuditLog(
  db: D1Database,
  userId: string | null,
  action: string,
  module: string,
  recordId: string | null,
  description: string
): Promise<void> {
  const id = crypto.randomUUID();
  try {
    await db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, module, record_id, description, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, userId, action, module, recordId, description).run();
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
