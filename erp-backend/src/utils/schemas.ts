import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine(
  (data) => !data.new_password || Boolean(data.current_password),
  { message: 'current_password is required to set a new_password', path: ['current_password'] }
);

export const VALID_INSTITUTION_TYPES = [
  'school',
  'college',
  'pu_college',
  'degree_college',
  'engineering_college',
  'university',
  'coaching'
] as const;

export const RegisterInstitutionSchema = z.object({
  name: z.string().min(2, 'Institution name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  institution_type: z.enum(VALID_INSTITUTION_TYPES).default('college'),
  admin_name: z.string().min(2, 'Admin name must be at least 2 characters'),
  admin_email: z.string().email('Invalid admin email'),
  admin_phone: z.string().optional(),
  admin_password: z.string().min(6, 'Password must be at least 6 characters'),
  invite_code: z.string().optional(),
});

export const InstitutionCreateSchema = z.object({
  name: z.string().min(2, 'Institution name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  logo: z.string().optional(),
  institution_type: z.enum(VALID_INSTITUTION_TYPES).default('college'),
  attendance_threshold: z.number().min(0).max(100).optional(),
  passing_marks: z.number().min(0).max(100).optional(),
});

export const InstitutionUpdateSchema = InstitutionCreateSchema.partial();

export const CreateInquirySchema = z.object({
  student_name: z.string().min(1, 'Student name is required'),
  parent_name: z.string().min(1, 'Parent/guardian name is required'),
  parent_phone: z.string().min(1, 'Parent/guardian phone is required'),
  parent_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  applying_for_class: z.string().min(1, 'Class applying for is required'),
  academic_year_id: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateApplicationSchema = z.object({
  inquiry_id: z.string().optional(),
  student_first_name: z.string().min(1, 'Student first name is required'),
  student_last_name: z.string().min(1, 'Student last name is required'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  applying_for_course_id: z.string().optional(),
  academic_year_id: z.string().min(1, 'Academic year is required'),
  parent_name: z.string().min(1, 'Parent/guardian name is required'),
  parent_phone: z.string().min(1, 'Parent/guardian phone is required'),
  parent_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  previous_school: z.string().optional(),
  previous_class: z.string().optional(),
});

export const StudentCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  admission_number: z.string().min(1, 'Admission number is required'),
  roll_number: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  blood_group: z.string().optional(),
  emergency_contact: z.string().optional(),
});

export const FeePaymentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  student_fee_record_id: z.string().min(1, 'Fee record ID is required'),
  amount: z.number().positive('Payment amount must be positive'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_reference: z.string().optional(),
  remarks: z.string().optional(),
});
