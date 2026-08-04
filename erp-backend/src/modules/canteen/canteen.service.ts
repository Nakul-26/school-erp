import { CanteenRepository } from './canteen.repository';
import {
  CreateMenuItemInput, UpdateMenuItemInput,
  CreateMealPlanInput, UpdateMealPlanInput,
  CreateSubscriptionInput,
} from './canteen.types';

export class CanteenServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class CanteenService {
  constructor(private repo: CanteenRepository, private db: any) {}

  // ---- Menu items ----
  async listMenuItems(institutionId: string) {
    return this.repo.listMenuItems(institutionId);
  }

  async createMenuItem(institutionId: string, input: CreateMenuItemInput, userId?: string): Promise<string> {
    if (!input.name || input.name.trim().length < 2) {
      throw new CanteenServiceError('Menu item name is required.', 400);
    }
    if (input.price !== undefined && input.price < 0) {
      throw new CanteenServiceError('Price cannot be negative.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.createMenuItem(id, institutionId, input, userId);
    return id;
  }

  async updateMenuItem(institutionId: string, id: string, input: UpdateMenuItemInput, userId?: string): Promise<void> {
    const existing = await this.repo.getMenuItem(id, institutionId);
    if (!existing) throw new CanteenServiceError('Menu item not found.', 404);
    if (input.price !== undefined && input.price < 0) {
      throw new CanteenServiceError('Price cannot be negative.', 400);
    }
    await this.repo.updateMenuItem(id, institutionId, input, userId);
  }

  async deleteMenuItem(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getMenuItem(id, institutionId);
    if (!existing) throw new CanteenServiceError('Menu item not found.', 404);
    await this.repo.deleteMenuItem(id, institutionId);
  }

  // ---- Meal plans ----
  async listMealPlans(institutionId: string) {
    return this.repo.listMealPlans(institutionId);
  }

  async createMealPlan(institutionId: string, input: CreateMealPlanInput, userId?: string): Promise<string> {
    if (!input.name || input.name.trim().length < 2) {
      throw new CanteenServiceError('Meal plan name is required.', 400);
    }
    if (input.monthly_price !== undefined && input.monthly_price < 0) {
      throw new CanteenServiceError('Monthly price cannot be negative.', 400);
    }
    const id = crypto.randomUUID();
    await this.repo.createMealPlan(id, institutionId, input, userId);
    return id;
  }

  async updateMealPlan(institutionId: string, id: string, input: UpdateMealPlanInput, userId?: string): Promise<void> {
    const existing = await this.repo.getMealPlan(id, institutionId);
    if (!existing) throw new CanteenServiceError('Meal plan not found.', 404);
    await this.repo.updateMealPlan(id, institutionId, input, userId);
  }

  async deleteMealPlan(institutionId: string, id: string): Promise<void> {
    const existing = await this.repo.getMealPlan(id, institutionId);
    if (!existing) throw new CanteenServiceError('Meal plan not found.', 404);
    await this.repo.deleteMealPlan(id, institutionId);
  }

  // ---- Subscriptions ----
  async listSubscriptions(institutionId: string, mealPlanId?: string) {
    return this.repo.listSubscriptions(institutionId, mealPlanId);
  }

  async getStudentSubscription(institutionId: string, studentId: string) {
    return this.repo.getActiveSubscriptionForStudent(studentId, institutionId);
  }

  async subscribe(institutionId: string, input: CreateSubscriptionInput, userId?: string): Promise<string> {
    if (!input.student_id || !input.meal_plan_id) {
      throw new CanteenServiceError('student_id and meal_plan_id are required.', 400);
    }
    const plan = await this.repo.getMealPlan(input.meal_plan_id, institutionId);
    if (!plan) throw new CanteenServiceError('Meal plan not found.', 404);

    const existing = await this.repo.getActiveSubscriptionForStudent(input.student_id, institutionId);
    if (existing) {
      throw new CanteenServiceError('This student already has an active canteen subscription — cancel it before subscribing to a new plan.', 409);
    }

    const id = crypto.randomUUID();
    try {
      await this.repo.createSubscription(id, institutionId, input, userId);
    } catch (err: any) {
      if (String(err?.message || '').includes('UNIQUE')) {
        throw new CanteenServiceError('This student already has an active canteen subscription.', 409);
      }
      throw err;
    }
    return id;
  }

  async cancelSubscription(institutionId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.repo.getSubscription(id, institutionId);
    if (!existing) throw new CanteenServiceError('Subscription not found.', 404);
    if (existing.status !== 'ACTIVE') throw new CanteenServiceError('This subscription is not active.', 400);
    await this.repo.cancelSubscription(id, institutionId, userId);
  }

  // ---- Billing (matches Transport/Hostel's manual "generate for the month" pattern) ----
  async generateMonthlyBilling(institutionId: string, dueDate: string, billingMonthName: string): Promise<{ billed: number; skipped: number }> {
    if (!dueDate || !billingMonthName) {
      throw new CanteenServiceError('due_date and billing_month_name are required.', 400);
    }
    const subs = await this.repo.listActiveSubscriptionsForBilling(institutionId);
    const feeTypeName = `Canteen Fee - ${billingMonthName}`;
    let billed = 0;
    let skipped = 0;

    for (const sub of subs) {
      const already = await this.db.prepare(
        `SELECT id FROM student_fee_records WHERE student_id = ? AND fee_type = ? AND is_active = 1`
      ).bind(sub.student_id, feeTypeName).first();

      if (already) {
        skipped++;
        continue;
      }

      await this.db.prepare(`
        INSERT INTO student_fee_records (
          id, institution_id, student_id, academic_year_id, course_id,
          year_number, fee_type, total_amount, paid_amount, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 'UNPAID')
      `).bind(
        crypto.randomUUID(), institutionId, sub.student_id, sub.academic_year_id, sub.course_id,
        sub.semester, feeTypeName, sub.monthly_price, dueDate
      ).run();
      billed++;
    }

    return { billed, skipped };
  }
}
