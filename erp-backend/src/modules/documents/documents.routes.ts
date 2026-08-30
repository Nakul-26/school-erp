import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

const docs = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

docs.use('*', authMiddleware);

// Roles allowed to manage documents (upload/version/archive/restore/delete/purge)
// and to see documents marked visibility: 'staff'. Matches the staff-role sets
// used elsewhere (e.g. sections.routes.ts, leave.routes.ts).
const STAFF_ROLES = ['admin', 'super_admin', 'Admin', 'Super Admin', 'Principal', 'HOD', 'Teacher', 'teacher', 'Accountant', 'accountant'];

function requireStaff() {
  return requireRole(...STAFF_ROLES);
}

function isStaffRole(user: any): boolean {
  const roles: string[] = user?.roles || (user?.role ? [user.role] : []);
  return roles.some((r) => STAFF_ROLES.includes(r));
}

function getService(c: any) {
  const repo = new DocumentsRepository(c.env.DB);
  return new DocumentsService(repo);
}

// authMiddleware runs on every route in this router and returns 401 before
// `next()` if it can't set `user`, so `user` is always present here. No
// fallback to a fake institution/user — if that invariant is ever broken,
// this should fail loudly (TypeError), not silently operate as 'inst-1'/'ADMIN'.
function getInstId(c: any): string {
  return c.get('user').institution_id;
}

function getUserId(c: any): string {
  return c.get('user').sub;
}

// Confirms the document exists and belongs to the caller's institution before
// a mutating action touches it, so a staff member can't archive/version/
// restore/delete another institution's document by guessing/reusing an id.
async function assertOwnedDoc(c: any, id: string | undefined): Promise<Response | null> {
  if (!id) return c.json({ error: 'Document not found' }, 404);
  const service = getService(c);
  const doc = await service.repo.getDocumentById(id);
  if (!doc || doc.institution_id !== getInstId(c)) {
    return c.json({ error: 'Document not found' }, 404);
  }
  return null;
}

// 1. Dashboard Metrics
docs.get('/stats/dashboard', requireStaff(), async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const stats = await service.repo.getStorageStats(institutionId);
  return c.json(stats);
});

// 2. List Documents
docs.get('/', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const category = c.req.query('category');
  const entityType = c.req.query('entity_type');
  const entityId = c.req.query('entity_id');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await service.repo.listDocuments({
    institution_id: institutionId,
    category,
    entity_type: entityType,
    entity_id: entityId,
    status,
    search,
    limit,
    offset,
    viewerIsStaff: isStaffRole(c.get('user'))
  });

  return c.json(result);
});

// 3. Upload Document Endpoint (JSON Base64 or FormData)
docs.post('/upload', requireStaff(), async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);

  let filename = 'file.txt';
  let mimeType = 'text/plain';
  let category = 'General';
  let entityType = 'System';
  let entityId = 'system';
  let buffer: ArrayBuffer = new Uint8Array(0).buffer;
  let changeSummary = 'Initial upload';
  let visibility: 'all' | 'staff' = 'all';

  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.parseBody();
    const file = formData['file'] as File;
    if (file && typeof file.arrayBuffer === 'function') {
      buffer = await file.arrayBuffer();
      filename = file.name || filename;
      mimeType = file.type || mimeType;
    }
    if (formData['category']) category = String(formData['category']);
    if (formData['entityType']) entityType = String(formData['entityType']);
    if (formData['entityId']) entityId = String(formData['entityId']);
    if (formData['visibility'] === 'staff') visibility = 'staff';
  } else {
    const body = await c.req.json();
    filename = body.filename || body.originalFilename || filename;
    mimeType = body.mimeType || mimeType;
    category = body.category || category;
    entityType = body.entityType || entityType;
    entityId = body.entityId || entityId;
    changeSummary = body.changeSummary || changeSummary;
    if (body.visibility === 'staff') visibility = 'staff';

    if (body.contentBase64) {
      const binaryString = atob(body.contentBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes.buffer;
    } else if (body.textContent) {
      buffer = new TextEncoder().encode(body.textContent).buffer;
    } else {
      buffer = new TextEncoder().encode(`Sample content for ${filename}`).buffer;
    }
  }

  try {
    const doc = await service.uploadDocument({
      institutionId,
      entityType,
      entityId,
      category,
      originalFilename: filename,
      mimeType,
      buffer,
      uploadedBy: userId,
      changeSummary,
      visibility
    }, c.env);

    return c.json(doc, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 4. Get Document Detail & Versions
docs.get('/:id', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const doc = await service.repo.getDocumentById(id);
  if (!doc || doc.institution_id !== getInstId(c)) return c.json({ error: 'Document not found' }, 404);
  if (doc.visibility === 'staff' && !isStaffRole(c.get('user'))) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const versions = await service.repo.listDocumentVersions(id);
  return c.json({
    ...doc,
    versions
  });
});

// 5. Upload New Version
docs.post('/:id/version', requireStaff(), async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const denied = await assertOwnedDoc(c, id);
  if (denied) return denied;
  const userId = getUserId(c);
  const body = await c.req.json();

  let buffer: ArrayBuffer = new Uint8Array(0).buffer;
  const filename = body.filename || body.originalFilename || 'updated_file.pdf';
  const mimeType = body.mimeType || 'application/pdf';

  if (body.contentBase64) {
    const binaryString = atob(body.contentBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  } else if (body.textContent) {
    buffer = new TextEncoder().encode(body.textContent).buffer;
  } else {
    buffer = new TextEncoder().encode(`Version update content for ${filename}`).buffer;
  }

  try {
    const updated = await service.uploadNewVersion(id!, {
      originalFilename: filename,
      mimeType,
      buffer,
      uploadedBy: userId,
      changeSummary: body.changeSummary || 'New version uploaded'
    }, c.env);

    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// Shared visibility gate for the read endpoints below — fetches the doc,
// 404s if it's not in the caller's institution, 403s if it's staff-only and
// the caller isn't staff. Returns the doc so callers don't re-fetch it.
async function loadDocForRead(c: any): Promise<{ doc: any } | { error: Response }> {
  const service = getService(c);
  const id = c.req.param('id');
  const doc = await service.repo.getDocumentById(id);
  if (!doc || doc.institution_id !== getInstId(c)) {
    return { error: c.json({ error: 'Document not found' }, 404) };
  }
  if (doc.visibility === 'staff' && !isStaffRole(c.get('user'))) {
    return { error: c.json({ error: 'Forbidden' }, 403) };
  }
  return { doc };
}

// 6. Generate Signed Download URL
docs.get('/:id/signed-url', async (c) => {
  const gate = await loadDocForRead(c);
  if ('error' in gate) return gate.error;

  const service = getService(c);
  const id = c.req.param('id');
  const expiresIn = parseInt(c.req.query('expires_in') || '900');

  try {
    const result = await service.generateSignedDownloadUrl(id, expiresIn, c.env);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 7. Download File Content
docs.get('/:id/download', async (c) => {
  const gate = await loadDocForRead(c);
  if ('error' in gate) return gate.error;

  const service = getService(c);
  const id = c.req.param('id');

  try {
    const { buffer, doc } = await service.downloadFileContent(id, c.env);
    return c.body(buffer, 200, {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.original_filename)}"`
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 8. Verify Checksum Integrity
docs.get('/:id/verify', async (c) => {
  const gate = await loadDocForRead(c);
  if ('error' in gate) return gate.error;

  const service = getService(c);
  const id = c.req.param('id');

  try {
    const result = await service.verifyIntegrity(id, c.env);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 9. Archive Document
docs.post('/:id/archive', requireStaff(), async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const denied = await assertOwnedDoc(c, id);
  if (denied) return denied;
  const userId = getUserId(c);

  try {
    const updated = await service.archiveDocument(id!, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 10. Restore Document
docs.post('/:id/restore', requireStaff(), async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const denied = await assertOwnedDoc(c, id);
  if (denied) return denied;
  const userId = getUserId(c);

  try {
    const updated = await service.restoreDocument(id!, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 11. Soft Delete Document
docs.delete('/:id', requireStaff(), async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const denied = await assertOwnedDoc(c, id);
  if (denied) return denied;
  const userId = getUserId(c);

  try {
    const updated = await service.softDeleteDocument(id!, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 12. Purge Expired Deleted Documents
docs.post('/purge-expired', requireStaff(), async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);
  const days = parseInt(c.req.query('days') || '90');

  const count = await service.purgeExpired(institutionId, days, userId, c.env);
  return c.json({ purgedCount: count });
});

export default docs;
