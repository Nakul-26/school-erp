export type DocumentStatus = 'UPLOADING' | 'AVAILABLE' | 'ARCHIVED' | 'DELETED';
export type StorageProviderType = 'R2' | 'S3' | 'LOCAL';
export type DocumentVisibility = 'all' | 'staff';

export interface DocumentMetadata {
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
  storage_provider: StorageProviderType;
  storage_key: string;
  version: number;
  status: DocumentStatus;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  visibility: DocumentVisibility;
}

export interface DocumentVersion {
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
  created_at: string;
}

export interface StorageProvider {
  upload(key: string, buffer: ArrayBuffer, mimeType: string): Promise<{ storageKey: string; etag?: string }>;
  download(key: string): Promise<ArrayBuffer>;
  delete(key: string): Promise<boolean>;
  generateSignedUrl(key: string, expiresInSeconds?: number, secret?: string): Promise<string>;
}

export interface UploadDocumentDTO {
  institutionId: string;
  entityType: string;
  entityId: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  buffer: ArrayBuffer;
  uploadedBy: string;
  storageProvider?: StorageProviderType;
  changeSummary?: string;
  visibility?: DocumentVisibility;
}

export interface SignedUrlPayload {
  documentId: string;
  storageKey: string;
  expiresAt: number;
  institutionId: string;
}
