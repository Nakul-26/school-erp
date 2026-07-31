import { Hono } from 'hono';
import { Env } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { DocumentsRepository } from './documents.repository';
import { DocumentsService } from './documents.service';

const docs = new Hono<{ Bindings: Env }>();

docs.use('*', authMiddleware);

function getService(c: any) {
  const repo = new DocumentsRepository(c.env.DB);
  return new DocumentsService(repo);
}

function getInstId(c: any): string {
  const user = c.get('user');
  return user?.institution_id || c.req.header('x-institution-id') || 'inst-1';
}

function getUserId(c: any): string {
  const user = c.get('user');
  return user?.sub || 'ADMIN';
}

// 1. Dashboard Metrics
docs.get('/stats/dashboard', async (c) => {
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
    offset
  });

  return c.json(result);
});

// 3. Upload Document Endpoint (JSON Base64 or FormData)
docs.post('/upload', async (c) => {
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
  } else {
    const body = await c.req.json();
    filename = body.filename || body.originalFilename || filename;
    mimeType = body.mimeType || mimeType;
    category = body.category || category;
    entityType = body.entityType || entityType;
    entityId = body.entityId || entityId;
    changeSummary = body.changeSummary || changeSummary;

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
      changeSummary
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
  if (!doc) return c.json({ error: 'Document not found' }, 404);

  const versions = await service.repo.listDocumentVersions(id);
  return c.json({
    ...doc,
    versions
  });
});

// 5. Upload New Version
docs.post('/:id/version', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
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
    const updated = await service.uploadNewVersion(id, {
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

// 6. Generate Signed Download URL
docs.get('/:id/signed-url', async (c) => {
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
docs.post('/:id/archive', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const updated = await service.archiveDocument(id, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 10. Restore Document
docs.post('/:id/restore', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const updated = await service.restoreDocument(id, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 11. Soft Delete Document
docs.delete('/:id', async (c) => {
  const service = getService(c);
  const id = c.req.param('id');
  const userId = getUserId(c);

  try {
    const updated = await service.softDeleteDocument(id, userId);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 12. Purge Expired Deleted Documents
docs.post('/purge-expired', async (c) => {
  const service = getService(c);
  const institutionId = getInstId(c);
  const userId = getUserId(c);
  const days = parseInt(c.req.query('days') || '90');

  const count = await service.purgeExpired(institutionId, days, userId, c.env);
  return c.json({ purgedCount: count });
});

export default docs;
