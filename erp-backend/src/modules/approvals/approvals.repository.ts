import { Approval, CreateApprovalInput } from './approvals.types';

export class ApprovalsRepository {
  constructor(private db: D1Database) {}

  async create(id: string, institutionId: string, requesterId: string, input: CreateApprovalInput): Promise<void> {
    await this.db.prepare(`
      INSERT INTO approvals (
        id, institution_id, requester_id, approval_type, entity_type, entity_id, payload, remarks, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      institutionId,
      requesterId,
      input.approval_type,
      input.entity_type,
      input.entity_id,
      input.payload || null,
      input.remarks || null,
      requesterId,
      requesterId
    ).run();
  }

  async list(institutionId: string, filters: { status?: string; requester_id?: string }): Promise<any[]> {
    let query = `
      SELECT 
        a.*,
        u.name as requester_name,
        u.email as requester_email,
        ap.name as approver_name
      FROM approvals a
      JOIN users u ON u.id = a.requester_id
      LEFT JOIN users ap ON ap.id = a.approver_id
      WHERE a.institution_id = ? AND a.is_active = 1
    `;
    const params: any[] = [institutionId];

    if (filters.status) {
      query += ' AND a.status = ?';
      params.push(filters.status);
    }
    if (filters.requester_id) {
      query += ' AND a.requester_id = ?';
      params.push(filters.requester_id);
    }

    query += ' ORDER BY a.created_at DESC';

    const { results } = await this.db.prepare(query).bind(...params).all<any>();
    return results || [];
  }

  async findById(id: string, institutionId: string): Promise<any | null> {
    return await this.db.prepare(`
      SELECT 
        a.*,
        u.name as requester_name,
        u.email as requester_email,
        ap.name as approver_name
      FROM approvals a
      JOIN users u ON u.id = a.requester_id
      LEFT JOIN users ap ON ap.id = a.approver_id
      WHERE a.id = ? AND a.institution_id = ? AND a.is_active = 1
    `).bind(id, institutionId).first();
  }

  async processApproval(id: string, institutionId: string, approverId: string, status: 'Approved' | 'Rejected', remarks?: string): Promise<void> {
    const approval = await this.db.prepare(`
      SELECT * FROM approvals WHERE id = ? AND institution_id = ? AND status = 'Pending'
    `).bind(id, institutionId).first<any>();

    if (!approval) {
      throw new Error('Approval request not found or already processed.');
    }

    const statements = [
      this.db.prepare(`
        UPDATE approvals
        SET status = ?, remarks = ?, approver_id = ?, approved_rejected_at = datetime('now'), updated_at = datetime('now'), updated_by = ?
        WHERE id = ? AND institution_id = ?
      `).bind(status, remarks || null, approverId, approverId, id, institutionId)
    ];

    const tableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (tableRegex.test(approval.entity_type)) {
      statements.push(
        this.db.prepare(`
          UPDATE ${approval.entity_type}
          SET status = ?, updated_at = datetime('now'), updated_by = ?
          WHERE id = ? AND institution_id = ?
        `).bind(status, approverId, approval.entity_id, institutionId)
      );
    }

    await this.db.batch(statements);
  }
}
