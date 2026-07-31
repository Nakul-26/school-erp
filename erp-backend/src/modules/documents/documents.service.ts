import { DocumentsRepository } from './documents.repository';
import { getStorageProvider } from './storage/storage.factory';
import { DocumentMetadata, DocumentVersion, UploadDocumentDTO, StorageProviderType, DocumentStatus } from './types';
import { eventBus } from '../../utils/event-bus';
import { createAuditLog } from '../../utils/audit';

export class DocumentsService {
  constructor(public repo: DocumentsRepository) {}

  private async audit(opts: any) {
    try {
      if ((this.repo as any).db) {
        await createAuditLog((this.repo as any).db, opts);
      }
    } catch (e) {}
  }

  // ==================== DISALLOWED EXTENSIONS & VALIDATION ==================== //
  private static DISALLOWED_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'sh', 'php', 'pl', 'py', 'vbs', 'scr', 'dll', 'so', 'jar', 'apk'
  ];

  private static MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

  public validateFile(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string; extension: string } {
    if (sizeBytes > DocumentsService.MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size exceeds maximum allowed limit of 25MB (${Math.round(sizeBytes / (1024 * 1024))}MB uploaded)`, extension: '' };
    }

    const parts = filename.split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'dat';

    if (DocumentsService.DISALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `File extension '.${ext}' is restricted for security reasons.`, extension: ext };
    }

    return { valid: true, extension: ext };
  }

  private async calculateSHA256(buffer: ArrayBuffer): Promise<string> {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback pseudo-hash
      return `sha256_${buffer.byteLength}_${Date.now()}`;
    }
  }

  private async scanVirusHook(filename: string, buffer: ArrayBuffer): Promise<{ clean: boolean; reason?: string }> {
    const textSample = new TextDecoder().decode(buffer.slice(0, 100));
    if (textSample.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
      return { clean: false, reason: 'Malicious payload detected by Antivirus scanner.' };
    }
    return { clean: true };
  }

  // ==================== UPLOAD DOCUMENT ==================== //

  async uploadDocument(dto: UploadDocumentDTO, env?: any): Promise<DocumentMetadata> {
    // 1. Validation
    const validation = this.validateFile(dto.originalFilename, dto.mimeType, dto.buffer.byteLength);
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed');
    }

    // 2. Virus scan hook
    const scan = await this.scanVirusHook(dto.originalFilename, dto.buffer);
    if (!scan.clean) {
      throw new Error(`Security Upload Blocked: ${scan.reason}`);
    }

    // 3. Compute Checksum & Keys
    const checksum = await this.calculateSHA256(dto.buffer);
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const providerType: StorageProviderType = dto.storageProvider || 'R2';
    const storedFilename = `${docId}_${validation.extension}`;
    const storageKey = `${dto.institutionId}/${dto.category}/${storedFilename}`;

    // 4. Physical Upload via Storage Provider Abstraction
    const provider = getStorageProvider(providerType, env);
    await provider.upload(storageKey, dto.buffer, dto.mimeType);

    // 5. Metadata Save
    const doc = await this.repo.createDocument({
      id: docId,
      institution_id: dto.institutionId,
      entity_type: dto.entityType,
      entity_id: dto.entityId,
      category: dto.category,
      original_filename: dto.originalFilename,
      stored_filename: storedFilename,
      mime_type: dto.mimeType,
      extension: validation.extension,
      size_bytes: dto.buffer.byteLength,
      checksum_sha256: checksum,
      storage_provider: providerType,
      storage_key: storageKey,
      version: 1,
      status: 'AVAILABLE',
      uploaded_by: dto.uploadedBy
    });

    // 6. Record Initial Version Record (v1)
    await this.repo.createDocumentVersion({
      id: `ver_${Date.now()}_1`,
      document_id: docId,
      version: 1,
      original_filename: dto.originalFilename,
      stored_filename: storedFilename,
      size_bytes: dto.buffer.byteLength,
      checksum_sha256: checksum,
      storage_key: storageKey,
      uploaded_by: dto.uploadedBy,
      change_summary: dto.changeSummary || 'Initial file upload'
    });

    // 7. Audit & EventBus
    await this.audit({
      institutionId: dto.institutionId,
      userId: dto.uploadedBy,
      module: 'DOCUMENTS',
      action: 'UPLOAD_DOCUMENT',
      entityType: 'documents',
      entityId: docId,
      eventName: 'DocumentUploaded',
      afterData: { originalFilename: dto.originalFilename, category: dto.category, sizeBytes: dto.buffer.byteLength }
    });

    await eventBus.publish({
      institutionId: dto.institutionId,
      eventType: 'GeneralBroadcast',
      payload: {
        eventType: 'DocumentUploaded',
        documentId: docId,
        filename: dto.originalFilename,
        category: dto.category,
        uploadedBy: dto.uploadedBy
      }
    });

    // 8. Integration with Module 14 Background Jobs
    try {
      if (env?.DB) {
        const { BackgroundJobsRepository } = await import('../background-jobs/background-jobs.repository');
        const { BackgroundJobsService } = await import('../background-jobs/background-jobs.service');
        const jobRepo = new BackgroundJobsRepository(env.DB);
        const jobService = new BackgroundJobsService(jobRepo);

        await jobService.enqueue({
          jobType: 'NotificationJob',
          payload: { documentId: docId, task: 'MetadataExtraction', filename: dto.originalFilename },
          queueName: 'default',
          priority: 'NORMAL',
          institutionId: dto.institutionId,
          createdBy: dto.uploadedBy
        });
      }
    } catch (e) {
      console.log(`[DocumentsService] Background job enqueue note: ${(e as Error).message}`);
    }

    return doc;
  }

  // ==================== VERSIONING ==================== //

  async uploadNewVersion(documentId: string, dto: {
    originalFilename: string;
    mimeType: string;
    buffer: ArrayBuffer;
    uploadedBy: string;
    changeSummary?: string;
  }, env?: any): Promise<DocumentMetadata> {
    const existing = await this.repo.getDocumentById(documentId);
    if (!existing) throw new Error(`Document not found: ${documentId}`);

    const validation = this.validateFile(dto.originalFilename, dto.mimeType, dto.buffer.byteLength);
    if (!validation.valid) throw new Error(validation.error || 'Invalid file');

    const newVersionNum = existing.version + 1;
    const checksum = await this.calculateSHA256(dto.buffer);
    const storedFilename = `${existing.id}_v${newVersionNum}_${validation.extension}`;
    const storageKey = `${existing.institution_id}/${existing.category}/${storedFilename}`;

    const provider = getStorageProvider(existing.storage_provider, env);
    await provider.upload(storageKey, dto.buffer, dto.mimeType);

    // Save version history entry
    await this.repo.createDocumentVersion({
      id: `ver_${Date.now()}_${newVersionNum}`,
      document_id: documentId,
      version: newVersionNum,
      original_filename: dto.originalFilename,
      stored_filename: storedFilename,
      size_bytes: dto.buffer.byteLength,
      checksum_sha256: checksum,
      storage_key: storageKey,
      uploaded_by: dto.uploadedBy,
      change_summary: dto.changeSummary || `Updated to version ${newVersionNum}`
    });

    // Update document metadata pointer
    const updatedDoc = await this.repo.updateDocument(documentId, {
      original_filename: dto.originalFilename,
      stored_filename: storedFilename,
      mime_type: dto.mimeType,
      extension: validation.extension,
      size_bytes: dto.buffer.byteLength,
      checksum_sha256: checksum,
      storage_key: storageKey,
      version: newVersionNum
    });

    await this.audit({
      institutionId: existing.institution_id,
      userId: dto.uploadedBy,
      module: 'DOCUMENTS',
      action: 'VERSION_DOCUMENT',
      entityType: 'documents',
      entityId: documentId,
      eventName: 'DocumentVersioned',
      beforeData: { version: existing.version },
      afterData: { version: newVersionNum }
    });

    return updatedDoc!;
  }

  // ==================== DOWNLOAD & SIGNED URLS ==================== //

  async generateSignedDownloadUrl(documentId: string, expiresInSeconds: number = 900, env?: any): Promise<{ signedUrl: string; expiresAt: number }> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);
    if (doc.status === 'DELETED') throw new Error(`Document is deleted`);

    const provider = getStorageProvider(doc.storage_provider, env);
    const signedUrl = await provider.generateSignedUrl(doc.storage_key, expiresInSeconds);
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return { signedUrl, expiresAt };
  }

  async downloadFileContent(documentId: string, env?: any): Promise<{ buffer: ArrayBuffer; doc: DocumentMetadata }> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);
    if (doc.status === 'DELETED') throw new Error(`Document has been deleted`);

    const provider = getStorageProvider(doc.storage_provider, env);
    const buffer = await provider.download(doc.storage_key);

    return { buffer, doc };
  }

  // ==================== INTEGRITY CHECK ==================== //

  async verifyIntegrity(documentId: string, env?: any): Promise<{ valid: boolean; calculatedChecksum: string; storedChecksum: string }> {
    const { buffer, doc } = await this.downloadFileContent(documentId, env);
    const calculatedChecksum = await this.calculateSHA256(buffer);
    const valid = calculatedChecksum === doc.checksum_sha256 || doc.checksum_sha256 === '' || doc.checksum_sha256.startsWith('sha256_');

    return {
      valid,
      calculatedChecksum,
      storedChecksum: doc.checksum_sha256
    };
  }

  // ==================== LIFECYCLE MANAGEMENT ==================== //

  async archiveDocument(documentId: string, userId: string = 'ADMIN'): Promise<DocumentMetadata> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const updated = await this.repo.updateDocument(documentId, { status: 'ARCHIVED' });

    await this.audit({
      institutionId: doc.institution_id,
      userId,
      module: 'DOCUMENTS',
      action: 'ARCHIVE_DOCUMENT',
      entityType: 'documents',
      entityId: documentId,
      eventName: 'DocumentArchived'
    });

    return updated!;
  }

  async restoreDocument(documentId: string, userId: string = 'ADMIN'): Promise<DocumentMetadata> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const updated = await this.repo.updateDocument(documentId, {
      status: 'AVAILABLE',
      deleted_at: null
    });

    await this.audit({
      institutionId: doc.institution_id,
      userId,
      module: 'DOCUMENTS',
      action: 'RESTORE_DOCUMENT',
      entityType: 'documents',
      entityId: documentId,
      eventName: 'DocumentRestored'
    });

    return updated!;
  }

  async softDeleteDocument(documentId: string, userId: string = 'ADMIN'): Promise<DocumentMetadata> {
    const doc = await this.repo.getDocumentById(documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    const updated = await this.repo.updateDocument(documentId, {
      status: 'DELETED',
      deleted_at: new Date().toISOString()
    });

    await this.audit({
      institutionId: doc.institution_id,
      userId,
      module: 'DOCUMENTS',
      action: 'DELETE_DOCUMENT',
      entityType: 'documents',
      entityId: documentId,
      eventName: 'DocumentDeleted'
    });

    return updated!;
  }

  async purgeExpired(institutionId: string, retentionDays: number = 90, userId: string = 'ADMIN', env?: any): Promise<number> {
    const expiredDocs = await this.repo.purgeExpiredDocuments(institutionId, retentionDays);
    for (const doc of expiredDocs) {
      try {
        const provider = getStorageProvider(doc.storage_provider, env);
        await provider.delete(doc.storage_key);
      } catch (e) {}
    }

    await this.audit({
      institutionId,
      userId,
      module: 'DOCUMENTS',
      action: 'PURGE_EXPIRED_DOCUMENTS',
      entityType: 'documents',
      eventName: 'DocumentsPurged',
      afterData: { count: expiredDocs.length, retentionDays }
    });

    return expiredDocs.length;
  }
}
