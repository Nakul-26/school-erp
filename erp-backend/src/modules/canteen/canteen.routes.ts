import { Hono } from 'hono';
import { Env, JwtPayload } from '../../types';
import { CanteenRepository } from './canteen.repository';
import { CanteenService, CanteenServiceError } from './canteen.service';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { createAuditLog } from '../../utils/audit';

const canteen = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

canteen.use('*', authMiddleware);

function getService(c: any): CanteenService {
  return new CanteenService(new CanteenRepository(c.env.DB), c.env.DB);
}

function handleError(c: any, e: any) {
  const statusCode = e instanceof CanteenServiceError ? e.statusCode : 400;
  return c.json({ error: e.message }, statusCode as any);
}

async function canAccessStudentCanteen(c: any, user: JwtPayload, studentId: string): Promise<boolean> {
  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  const isParent = roles.some((r: string) => ['parent', 'Parent', 'guardian', 'Guardian'].includes(r));

  if (isStudent) {
    const row = await c.env.DB.prepare(
      'SELECT 1 FROM students WHERE user_id = ? AND id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  if (isParent) {
    const row = await c.env.DB.prepare(`
      SELECT 1 FROM guardians g JOIN students s ON s.id = g.student_id
      WHERE g.user_id = ? AND g.student_id = ? AND g.is_active = 1 AND s.institution_id = ? AND s.is_active = 1
    `).bind(user.sub, studentId, user.institution_id).first();
    return !!row;
  }
  return true; // staff — gated by canteen.view/manage at the route level for mutating actions
}

// ==================== MENU ITEMS ==================== //

canteen.get('/menu', requirePermission('canteen.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.listMenuItems(user.institution_id));
});

canteen.post('/menu', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createMenuItem(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CANTEEN', action: 'CREATE_MENU_ITEM', entityType: 'canteen_menu_items', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

canteen.put('/menu/:id', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const body = await c.req.json();
  try {
    await service.updateMenuItem(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

canteen.delete('/menu/:id', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.deleteMenuItem(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== MEAL PLANS ==================== //

canteen.get('/plans', requirePermission('canteen.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  return c.json(await service.listMealPlans(user.institution_id));
});

canteen.post('/plans', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const body = await c.req.json();
  try {
    const id = await service.createMealPlan(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CANTEEN', action: 'CREATE_MEAL_PLAN', entityType: 'canteen_meal_plans', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

canteen.put('/plans/:id', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  const body = await c.req.json();
  try {
    await service.updateMealPlan(user.institution_id, id, body, user.sub);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

canteen.delete('/plans/:id', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;
  try {
    await service.deleteMealPlan(user.institution_id, id);
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== SUBSCRIPTIONS ==================== //

canteen.get('/subscriptions', requirePermission('canteen.view'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const mealPlanId = c.req.query('mealPlanId');
  return c.json(await service.listSubscriptions(user.institution_id, mealPlanId));
});

// Single student's current canteen subscription (self/parent/staff) — used for the per-student view.
canteen.get('/student/:studentId', async (c) => {
  const user = c.get('user');
  const studentId = c.req.param('studentId')!;
  if (!(await canAccessStudentCanteen(c, user, studentId))) {
    return c.json({ error: "Forbidden: cannot access this student's canteen record" }, 403);
  }
  const service = getService(c);
  const subscription = await service.getStudentSubscription(user.institution_id, studentId);
  return c.json({ subscription });
});

canteen.post('/subscriptions', async (c) => {
  const user = c.get('user');
  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  const service = getService(c);
  const body = await c.req.json();

  if (isStudent) {
    // Students self-serve subscribing to a plan; staff must supply student_id and have canteen.manage.
    const studentRow = await c.env.DB.prepare(
      'SELECT id FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1'
    ).bind(user.sub, user.institution_id).first<{ id: string }>();
    if (!studentRow) return c.json({ error: 'Student profile not found for current user' }, 403);
    body.student_id = studentRow.id;
  } else {
    const perms = user.permissions || [];
    if (!perms.includes('canteen.manage')) {
      return c.json({ error: 'Forbidden: missing canteen.manage permission' }, 403);
    }
  }

  try {
    const id = await service.subscribe(user.institution_id, body, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CANTEEN', action: 'SUBSCRIBE', entityType: 'canteen_subscriptions', entityId: id, afterData: body });
    return c.json({ id }, 201);
  } catch (e: any) {
    return handleError(c, e);
  }
});

canteen.post('/subscriptions/:id/cancel', async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const id = c.req.param('id')!;

  const roles = user.roles || (user.role ? [user.role] : []);
  const isStudent = roles.some((r: string) => ['student', 'Student'].includes(r));
  if (!isStudent && !(user.permissions || []).includes('canteen.manage')) {
    return c.json({ error: 'Forbidden: missing canteen.manage permission' }, 403);
  }

  try {
    if (isStudent) {
      const studentRow = await c.env.DB.prepare(
        'SELECT id FROM students WHERE user_id = ? AND institution_id = ? AND is_active = 1'
      ).bind(user.sub, user.institution_id).first<{ id: string }>();
      const existing = await c.env.DB.prepare(
        'SELECT id FROM canteen_subscriptions WHERE id = ? AND institution_id = ?'
      ).bind(id, user.institution_id).first<{ id: string }>();
      if (!studentRow || !existing) return c.json({ error: 'Subscription not found' }, 404);
    }
    await service.cancelSubscription(user.institution_id, id, user.sub);
    await createAuditLog(c.env.DB, { institutionId: user.institution_id, userId: user.sub, module: 'CANTEEN', action: 'CANCEL_SUBSCRIPTION', entityType: 'canteen_subscriptions', entityId: id });
    return c.json({ success: true });
  } catch (e: any) {
    return handleError(c, e);
  }
});

// ==================== BILLING ==================== //

canteen.post('/billing/generate', requirePermission('canteen.manage'), async (c) => {
  const user = c.get('user');
  const service = getService(c);
  const { due_date, billing_month_name } = await c.req.json();
  try {
    const result = await service.generateMonthlyBilling(user.institution_id, due_date, billing_month_name);
    return c.json({ success: true, message: `Billed: ${result.billed} students. Skipped (already billed): ${result.skipped} students.` });
  } catch (e: any) {
    return handleError(c, e);
  }
});

export default canteen;
