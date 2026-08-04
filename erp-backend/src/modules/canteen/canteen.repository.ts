import {
  CanteenMenuItem, CreateMenuItemInput, UpdateMenuItemInput,
  CanteenMealPlan, CreateMealPlanInput, UpdateMealPlanInput,
  CanteenSubscription, CreateSubscriptionInput,
} from './canteen.types';

export class CanteenRepository {
  constructor(private db: any) {}

  // ==================== MENU ITEMS ==================== //

  async listMenuItems(institutionId: string): Promise<CanteenMenuItem[]> {
    const res = await this.db.prepare(
      `SELECT * FROM canteen_menu_items WHERE institution_id = ? AND is_active = 1 ORDER BY category ASC, name ASC`
    ).bind(institutionId).all();
    return (res.results || []) as CanteenMenuItem[];
  }

  async getMenuItem(id: string, institutionId: string): Promise<CanteenMenuItem | null> {
    const row = await this.db.prepare(
      `SELECT * FROM canteen_menu_items WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as CanteenMenuItem) : null;
  }

  async createMenuItem(id: string, institutionId: string, input: CreateMenuItemInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO canteen_menu_items (id, institution_id, name, category, price, is_available, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.name, input.category || 'General', input.price ?? 0.0,
      input.is_available === false ? 0 : 1, now, now, userId || null, userId || null
    ).run();
  }

  async updateMenuItem(id: string, institutionId: string, input: UpdateMenuItemInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_available' ? (value ? 1 : 0) : value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE canteen_menu_items SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteMenuItem(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE canteen_menu_items SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ==================== MEAL PLANS ==================== //

  async listMealPlans(institutionId: string): Promise<CanteenMealPlan[]> {
    const res = await this.db.prepare(
      `SELECT * FROM canteen_meal_plans WHERE institution_id = ? AND is_active = 1 ORDER BY name ASC`
    ).bind(institutionId).all();
    return (res.results || []) as CanteenMealPlan[];
  }

  async getMealPlan(id: string, institutionId: string): Promise<CanteenMealPlan | null> {
    const row = await this.db.prepare(
      `SELECT * FROM canteen_meal_plans WHERE id = ? AND institution_id = ? AND is_active = 1`
    ).bind(id, institutionId).first();
    return row ? (row as CanteenMealPlan) : null;
  }

  async createMealPlan(id: string, institutionId: string, input: CreateMealPlanInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO canteen_meal_plans (id, institution_id, name, description, monthly_price, meal_types, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.name, input.description || null, input.monthly_price ?? 0.0,
      input.meal_types || 'Lunch', now, now, userId || null, userId || null
    ).run();
  }

  async updateMealPlan(id: string, institutionId: string, input: UpdateMealPlanInput, userId?: string): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId || null, id, institutionId);
    await this.db.prepare(
      `UPDATE canteen_meal_plans SET ${fields.join(', ')} WHERE id = ? AND institution_id = ?`
    ).bind(...values).run();
  }

  async deleteMealPlan(id: string, institutionId: string): Promise<void> {
    await this.db.prepare(
      `UPDATE canteen_meal_plans SET is_active = 0, updated_at = ? WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), id, institutionId).run();
  }

  // ==================== SUBSCRIPTIONS ==================== //

  async listSubscriptions(institutionId: string, mealPlanId?: string): Promise<CanteenSubscription[]> {
    let query = `
      SELECT sub.*, s.first_name || ' ' || COALESCE(s.last_name, '') as student_name, s.admission_number,
        p.name as plan_name, p.monthly_price
      FROM canteen_subscriptions sub
      JOIN students s ON s.id = sub.student_id
      JOIN canteen_meal_plans p ON p.id = sub.meal_plan_id
      WHERE sub.institution_id = ? AND sub.status = 'ACTIVE'`;
    const params: any[] = [institutionId];
    if (mealPlanId) {
      query += ` AND sub.meal_plan_id = ?`;
      params.push(mealPlanId);
    }
    query += ` ORDER BY s.first_name ASC`;
    const res = await this.db.prepare(query).bind(...params).all();
    return (res.results || []) as CanteenSubscription[];
  }

  async getActiveSubscriptionForStudent(studentId: string, institutionId: string): Promise<CanteenSubscription | null> {
    const row = await this.db.prepare(`
      SELECT sub.*, p.name as plan_name, p.monthly_price
      FROM canteen_subscriptions sub
      JOIN canteen_meal_plans p ON p.id = sub.meal_plan_id
      WHERE sub.student_id = ? AND sub.institution_id = ? AND sub.status = 'ACTIVE'
    `).bind(studentId, institutionId).first();
    return row ? (row as CanteenSubscription) : null;
  }

  async getSubscription(id: string, institutionId: string): Promise<CanteenSubscription | null> {
    const row = await this.db.prepare(
      `SELECT * FROM canteen_subscriptions WHERE id = ? AND institution_id = ?`
    ).bind(id, institutionId).first();
    return row ? (row as CanteenSubscription) : null;
  }

  async createSubscription(id: string, institutionId: string, input: CreateSubscriptionInput, userId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      `INSERT INTO canteen_subscriptions (id, institution_id, student_id, meal_plan_id, start_date, status, created_at, updated_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`
    ).bind(
      id, institutionId, input.student_id, input.meal_plan_id, input.start_date || new Date().toISOString().slice(0, 10),
      now, now, userId || null, userId || null
    ).run();
  }

  async cancelSubscription(id: string, institutionId: string, userId?: string): Promise<void> {
    await this.db.prepare(
      `UPDATE canteen_subscriptions SET status = 'CANCELLED', end_date = date('now'), updated_at = ?, updated_by = ?
       WHERE id = ? AND institution_id = ?`
    ).bind(new Date().toISOString(), userId || null, id, institutionId).run();
  }

  async listActiveSubscriptionsForBilling(institutionId: string): Promise<{
    student_id: string; monthly_price: number; academic_year_id: string; course_id: string; semester: number;
  }[]> {
    const res = await this.db.prepare(`
      SELECT sub.student_id, p.monthly_price, sen.academic_year_id, sen.course_id, sen.semester
      FROM canteen_subscriptions sub
      JOIN canteen_meal_plans p ON p.id = sub.meal_plan_id
      JOIN student_enrollments sen ON sen.student_id = sub.student_id AND sen.is_active = 1
      WHERE sub.institution_id = ? AND sub.status = 'ACTIVE'
    `).bind(institutionId).all();
    return (res.results || []) as any[];
  }
}
