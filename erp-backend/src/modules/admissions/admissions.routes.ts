import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { AdmissionsRepository } from './admissions.repository';
import { AdmissionsService } from './admissions.service';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const admissions = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

admissions.use('*', authMiddleware);

// --- INQUIRIES ---

admissions.get(
  '/inquiries',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const status = c.req.query('status');
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);
    const results = await service.listInquiries(user.institution_id, status);
    return c.json(results);
  }
);

admissions.post(
  '/inquiries',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const input = await c.req.json();
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    try {
      const id = await service.createInquiry(user.institution_id, input, user.sub);
      await createAuditLog(
        c.env.DB, user.sub, 'CREATE_ADMISSION_INQUIRY', 'admissions', id,
        `Created admission inquiry for ${input.student_name}`
      );
      return c.json({ id }, 201);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

admissions.get(
  '/inquiries/:id',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    const inquiry = await repo.getInquiryById(id);
    if (!inquiry || inquiry.institution_id !== user.institution_id) {
      return c.json({ error: 'Inquiry not found' }, 404);
    }

    return c.json(inquiry);
  }
);

admissions.patch(
  '/inquiries/:id',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const input = await c.req.json();
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    const existing = await repo.getInquiryById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Inquiry not found' }, 404);
    }

    try {
      // If only status is being updated, use dedicated status method for validation
      if (input.status && Object.keys(input).length === 1) {
        await service.updateInquiryStatus(id, input.status, user.sub);
      } else {
        await service.updateInquiry(id, input, user.sub);
      }
      await createAuditLog(
        c.env.DB, user.sub, 'UPDATE_ADMISSION_INQUIRY', 'admissions', id,
        `Updated admission inquiry for ${existing.student_name}`
      );
      return c.json({ success: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

admissions.post(
  '/inquiries/:id/convert',
  requireRole('admin', 'super_admin', 'Principal'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const body = await c.req.json();
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    try {
      const applicationId = await service.convertInquiryToApplication(
        id, user.institution_id, body, user.sub
      );
      await createAuditLog(
        c.env.DB, user.sub, 'CONVERT_INQUIRY_TO_APPLICATION', 'admissions', id,
        `Converted inquiry ${id} to application ${applicationId}`
      );
      return c.json({ applicationId }, 201);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

// --- APPLICATIONS ---

admissions.get(
  '/applications',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const status = c.req.query('status');
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);
    const results = await service.listApplications(user.institution_id, status);
    return c.json(results);
  }
);

admissions.post(
  '/applications',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const input = await c.req.json();
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    try {
      const id = await service.createApplication(user.institution_id, input, user.sub);
      await createAuditLog(
        c.env.DB, user.sub, 'CREATE_ADMISSION_APPLICATION', 'admissions', id,
        `Created admission application for ${input.student_first_name} ${input.student_last_name}`
      );
      return c.json({ id }, 201);
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

admissions.get(
  '/applications/:id',
  requireRole('admin', 'super_admin', 'Principal', 'HOD'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    const application = await service.getApplicationDetail(id);
    if (!application || application.institution_id !== user.institution_id) {
      return c.json({ error: 'Application not found' }, 404);
    }

    return c.json(application);
  }
);

admissions.patch(
  '/applications/:id/approve',
  requireRole('admin', 'super_admin', 'Principal'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    try {
      const result = await service.approveApplication(id, user.institution_id, user.sub, c.env.DB);
      await createAuditLog(
        c.env.DB, user.sub, 'APPROVE_ADMISSION_APPLICATION', 'admissions', id,
        `Approved application ${id}, created student ${result.studentId} with admission no ${result.admissionNumber}`
      );
      return c.json({ success: true, ...result });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

admissions.patch(
  '/applications/:id/reject',
  requireRole('admin', 'super_admin', 'Principal'),
  async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')!;
    const { reason } = await c.req.json();
    const repo = new AdmissionsRepository(c.env.DB);
    const service = new AdmissionsService(repo);

    const existing = await repo.getApplicationById(id);
    if (!existing || existing.institution_id !== user.institution_id) {
      return c.json({ error: 'Application not found' }, 404);
    }

    try {
      await service.rejectApplication(id, reason || '', user.sub);
      await createAuditLog(
        c.env.DB, user.sub, 'REJECT_ADMISSION_APPLICATION', 'admissions', id,
        `Rejected application ${id}: ${reason}`
      );
      return c.json({ success: true });
    } catch (e: any) {
      return c.json({ error: e.message }, 400);
    }
  }
);

export default admissions;
