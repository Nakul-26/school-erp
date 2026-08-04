export type MenuCategory = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' | 'Beverages' | 'General';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface CanteenMenuItem {
  id: string;
  institution_id: string;
  name: string;
  category: MenuCategory;
  price: number;
  is_available: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemInput {
  name: string;
  category?: MenuCategory;
  price?: number;
  is_available?: boolean;
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export interface CanteenMealPlan {
  id: string;
  institution_id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  meal_types: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMealPlanInput {
  name: string;
  description?: string;
  monthly_price?: number;
  meal_types?: string;
}

export type UpdateMealPlanInput = Partial<CreateMealPlanInput>;

export interface CanteenSubscription {
  id: string;
  institution_id: string;
  student_id: string;
  meal_plan_id: string;
  start_date: string;
  end_date: string | null;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;

  student_name?: string;
  admission_number?: string;
  plan_name?: string;
  monthly_price?: number;
}

export interface CreateSubscriptionInput {
  student_id: string;
  meal_plan_id: string;
  start_date?: string;
}
