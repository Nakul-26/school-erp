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

function bytesStartWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

// The browser-supplied `file.type` is attacker-controlled (it's just the
// Content-Type of the form part), so a relabeled executable would otherwise
// sail through an allow-list check on MIME type alone. Where a format has a
// reliable magic number, verify the actual bytes match what the declared
// MIME type claims to be. Plain text/CSV have no fixed signature, so they
// fall back to the MIME-type check only.
const MIME_SIGNATURES: Record<string, (bytes: Uint8Array) => boolean> = {
  'application/pdf': (b) => bytesStartWith(b, [0x25, 0x50, 0x44, 0x46]), // %PDF
  'image/jpeg': (b) => bytesStartWith(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => bytesStartWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/webp': (b) => bytesStartWith(b, [0x52, 0x49, 0x46, 0x46]) && bytesStartWith(b, [0x57, 0x45, 0x42, 0x50], 8), // RIFF....WEBP
  // .docx / .xlsx are zip containers (PK\x03\x04)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) => bytesStartWith(b, [0x50, 0x4b, 0x03, 0x04]),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) => bytesStartWith(b, [0x50, 0x4b, 0x03, 0x04]),
};

export async function validateUploadedFile(file: File, options?: { photoOnly?: boolean; maxBytes?: number }): Promise<string | null> {
  const maxBytes = options?.maxBytes || DEFAULT_MAX_FILE_SIZE;
  const allowedTypes = options?.photoOnly ? ALLOWED_PHOTO_MIME_TYPES : ALLOWED_MIME_TYPES;

  if (file.size <= 0) return 'Uploaded file is empty.';
  if (file.size > maxBytes) return `Uploaded file is too large. Maximum allowed size is ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  if (!allowedTypes.has(file.type)) return 'Uploaded file type is not allowed.';

  const signatureCheck = MIME_SIGNATURES[file.type];
  if (signatureCheck) {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!signatureCheck(head)) {
      return 'Uploaded file content does not match its declared type.';
    }
  }

  return null;
}
