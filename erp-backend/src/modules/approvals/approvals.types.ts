export interface Approval {
  id: string;
  institution_id: string;
  requester_id: string;
  approval_type: string;                      // 'LEAVE_REQUEST', 'ATTENDANCE_CORRECTION', 'FEE_REFUND', 'STUDENT_WITHDRAWAL'
  entity_type: string;                        // e.g. 'teacher_leaves', 'attendance_records'
  entity_id: string;                          // Target record ID inside the table
  payload?: string;                           // JSON configurations
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  approver_id?: string;
  approved_rejected_at?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateApprovalInput {
  approval_type: string;
  entity_type: string;
  entity_id: string;
  payload?: string;
  remarks?: string;
}
