export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  is_active: number;
}

export interface CreateCompanyInput {
  name: string;
  industry?: string;
  website?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  description?: string;
}

export type DriveType = 'PLACEMENT' | 'INTERNSHIP';
export type DriveStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED';
export type ApplicationStatus = 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWED' | 'OFFERED' | 'REJECTED' | 'WITHDRAWN';

export interface PlacementDrive {
  id: string;
  company_id: string;
  company_name: string;
  course_id: string;
  course_name: string;
  title: string;
  drive_type: DriveType;
  description: string | null;
  package_amount: number | null;
  drive_date: string | null;
  application_deadline: string | null;
  min_cgpa: number | null;
  max_backlogs: number | null;
  status: DriveStatus;
  applicant_count?: number;
}

export interface CreateDriveInput {
  company_id: string;
  course_id: string;
  title: string;
  drive_type: DriveType;
  description?: string;
  package_amount?: number | undefined;
  drive_date?: string;
  application_deadline?: string;
  min_cgpa?: number | undefined;
  max_backlogs?: number | undefined;
}

export interface UpdateDriveInput {
  title?: string;
  description?: string;
  package_amount?: number;
  drive_date?: string;
  application_deadline?: string;
  min_cgpa?: number;
  max_backlogs?: number;
  status?: DriveStatus;
}

export interface PlacementApplication {
  id: string;
  drive_id: string;
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  status: ApplicationStatus;
  applied_at: string;
  offer_package: number | null;
  offer_date: string | null;
  remarks: string | null;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  offer_package?: number | undefined;
  offer_date?: string | undefined;
  remarks?: string;
}
