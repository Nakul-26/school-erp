export interface StudentLeaveApplication {
  id: string;
  institution_id: string;
  student_id: string;
  from_date: string;
  to_date: string;
  days_count: number;
  reason: string;
  applied_by: 'student' | 'parent';
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  remarks: string | null;
  is_active: number;
  created_at: string;
}

export type CreateStudentLeaveInput = Omit<StudentLeaveApplication, 'id' | 'institution_id' | 'status' | 'reviewed_by' | 'reviewed_at' | 'remarks' | 'is_active' | 'created_at'>;
