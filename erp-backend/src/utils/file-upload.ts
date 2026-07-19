const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function sanitizeFileName(name: string): string {
  const withoutPath = name.split(/[\\/]/).pop() || 'upload';
  const sanitized = withoutPath.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return sanitized.slice(0, 120) || 'upload';
}

export function validateUploadedFile(file: File, options?: { photoOnly?: boolean; maxBytes?: number }): string | null {
  const maxBytes = options?.maxBytes || DEFAULT_MAX_FILE_SIZE;
  const allowedTypes = options?.photoOnly ? ALLOWED_PHOTO_MIME_TYPES : ALLOWED_MIME_TYPES;

  if (file.size <= 0) return 'Uploaded file is empty.';
  if (file.size > maxBytes) return `Uploaded file is too large. Maximum allowed size is ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  if (!allowedTypes.has(file.type)) return 'Uploaded file type is not allowed.';

  return null;
}
