import { DocumentMetadata, DocumentVersion, DocumentStatus, StorageProviderType } from './types';

export class DocumentsRepository {
  constructor(private db: any) {}

  async createDocument(data: {
    id: string;
    institution_id: string;
    entity_type: string;
    entity_id: string;
    category: string;
    original_filename: string;
    stored_filename: string;
    mime_type: string;
    extension: string;
    size_bytes: number;
    checksum_sha256: string;
    storage_provider?: StorageProviderType;
    storage_key: string;
    version?: number;
    status?: DocumentStatus;
    uploaded_by: string;
  }): Promise<DocumentMetadata> {
    const now = new Date().toISOString();
    const status = data.status || 'AVAILABLE';
    const provider = data.storage_provider || 'R2';
    const version = data.version || 1;

    await this.db.prepare(
      `INSERT INTO documents (
        id, institution_id, entity_type, entity_id, category,
        original_filename, stored_filename, mime_type, extension,
        size_bytes, checksum_sha256, storage_provider, storage_key,
        version, status, uploaded_by, name, file_key, file_size, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.institution_id,
      data.entity_type,
      data.entity_id,
      data.category,
      data.original_filename,
      data.stored_filename,
      data.mime_type,
      data.extension,
      data.size_bytes,
      data.checksum_sha256,
      provider,
      data.storage_key,
      version,
      status,
      data.uploaded_by,
      data.original_filename, // legacy name
      data.storage_key,      // legacy file_key
      data.size_bytes,       // legacy file_size
      now,
      now
    ).run();

    return (await this.getDocumentById(data.id))!;
  }

  async getDocumentById(id: string): Promise<DocumentMetadata | null> {
    const row = await this.db.prepare(`SELECT * FROM documents WHERE id = ?`).bind(id).first();
    return row ? (row as DocumentMetadata) : null;
  }

  async listDocuments(filters: {
    institution_id: string;
    category?: string;
    entity_type?: string;
    entity_id?: string;
    status?: string;
    search?: string;
    uploaded_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: DocumentMetadata[]; total: number }> {
    let query = `SELECT * FROM documents WHERE institution_id = ?`;
    let countQuery = `SELECT COUNT(*) as count FROM documents WHERE institution_id = ?`;
    const params: any[] = [filters.institution_id];
    const countParams: any[] = [filters.institution_id];

    if (filters.status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(filters.status);
      countParams.push(filters.status);
    } else {
      query += ` AND status != 'DELETED'`;
      countQuery += ` AND status != 'DELETED'`;
    }

    if (filters.category) {
      query += ` AND category = ?`;
      countQuery += ` AND category = ?`;
      params.push(filters.category);
      countParams.push(filters.category);
    }

    if (filters.entity_type) {
      query += ` AND entity_type = ?`;
      countQuery += ` AND entity_type = ?`;
      params.push(filters.entity_type);
      countParams.push(filters.entity_type);
    }

    if (filters.entity_id) {
      query += ` AND entity_id = ?`;
      countQuery += ` AND entity_id = ?`;
      params.push(filters.entity_id);
      countParams.push(filters.entity_id);
    }

    if (filters.uploaded_by) {
      query += ` AND uploaded_by = ?`;
      countQuery += ` AND uploaded_by = ?`;
      params.push(filters.uploaded_by);
      countParams.push(filters.uploaded_by);
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      query += ` AND (original_filename LIKE ? OR stored_filename LIKE ? OR category LIKE ? OR entity_type LIKE ?)`;
      countQuery += ` AND (original_filename LIKE ? OR stored_filename LIKE ? OR category LIKE ? OR entity_type LIKE ?)`;
      params.push(term, term, term, term);
      countParams.push(term, term, term, term);
    }

    query += ` ORDER BY created_at DESC`;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rowsRes, countRes] = await Promise.all([
      this.db.prepare(query).bind(...params).all(),
      this.db.prepare(countQuery).bind(...countParams).first()
    ]);

    return {
      documents: (rowsRes.results || []) as DocumentMetadata[],
      total: countRes ? (countRes.count as number) : 0
    };
  }

  async updateDocument(id: string, fields: Partial<DocumentMetadata>): Promise<DocumentMetadata | null> {
    const keys = Object.keys(fields).filter(k => k !== 'id');
    if (keys.length === 0) return this.getDocumentById(id);

    const now = new Date().toISOString();
    fields.updated_at = now;
    if (!keys.includes('updated_at')) keys.push('updated_at');

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (fields as any)[k]);
    values.push(id);

    await this.db.prepare(`UPDATE documents SET ${setClauses} WHERE id = ?`).bind(...values).run();
    return this.getDocumentById(id);
  }

  // ==================== DOCUMENT VERSIONS ==================== //

  async createDocumentVersion(data: {
    id: string;
    document_id: string;
    version: number;
    original_filename: string;
    stored_filename: string;
    size_bytes: number;
    checksum_sha256: string;
    storage_key: string;
    uploaded_by: string;
    change_summary?: string | null;
  }): Promise<DocumentVersion> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO document_versions (
        id, document_id, version, original_filename, stored_filename,
        size_bytes, checksum_sha256, storage_key, uploaded_by, change_summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.document_id,
      data.version,
      data.original_filename,
      data.stored_filename,
      data.size_bytes,
      data.checksum_sha256,
      data.storage_key,
      data.uploaded_by,
      data.change_summary || null,
      now
    ).run();

    const row = await this.db.prepare(`SELECT * FROM document_versions WHERE id = ?`).bind(data.id).first();
    return row as DocumentVersion;
  }

  async listDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const res = await this.db.prepare(
      `SELECT * FROM document_versions WHERE document_id = ? ORDER BY version DESC`
    ).bind(documentId).all();
    return (res.results || []) as DocumentVersion[];
  }

  async deleteDocumentRecord(id: string): Promise<boolean> {
    const res = await this.db.prepare(`DELETE FROM documents WHERE id = ?`).bind(id).run();
    return (res?.meta?.changes || 0) > 0;
  }

  async purgeExpiredDocuments(institution_id: string, retentionDays: number = 90): Promise<DocumentMetadata[]> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const res = await this.db.prepare(
      `SELECT * FROM documents WHERE institution_id = ? AND status = 'DELETED' AND deleted_at <= ?`
    ).bind(institution_id, cutoffDate).all();

    const expiredDocs = (res.results || []) as DocumentMetadata[];
    if (expiredDocs.length > 0) {
      await this.db.prepare(
        `DELETE FROM documents WHERE institution_id = ? AND status = 'DELETED' AND deleted_at <= ?`
      ).bind(institution_id, cutoffDate).run();
    }

    return expiredDocs;
  }

  // ==================== DASHBOARD METRICS ==================== //

  async getStorageStats(institution_id: string): Promise<{
    totalDocuments: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    categoryBreakdown: Record<string, number>;
    largestFiles: DocumentMetadata[];
    monthlyUploadsCount: number;
  }> {
    const totalRes = await this.db.prepare(
      `SELECT COUNT(*) as count, SUM(size_bytes) as totalBytes FROM documents WHERE institution_id = ? AND status != 'DELETED'`
    ).bind(institution_id).first();

    const catRes = await this.db.prepare(
      `SELECT category, COUNT(*) as count FROM documents WHERE institution_id = ? AND status != 'DELETED' GROUP BY category`
    ).bind(institution_id).all();

    const categoryBreakdown: Record<string, number> = {};
    for (const r of (catRes.results || [])) {
      categoryBreakdown[r.category] = r.count;
    }

    const largestRes = await this.db.prepare(
      `SELECT * FROM documents WHERE institution_id = ? AND status != 'DELETED' ORDER BY size_bytes DESC LIMIT 5`
    ).bind(institution_id).all();

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const monthlyRes = await this.db.prepare(
      `SELECT COUNT(*) as count FROM documents WHERE institution_id = ? AND created_at >= ?`
    ).bind(institution_id, monthAgo).first();

    const totalBytes = totalRes?.totalBytes || 0;
    const totalSizeMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;

    return {
      totalDocuments: totalRes?.count || 0,
      totalSizeBytes: totalBytes,
      totalSizeMB,
      categoryBreakdown,
      largestFiles: (largestRes.results || []) as DocumentMetadata[],
      monthlyUploadsCount: monthlyRes?.count || 0
    };
  }
}
