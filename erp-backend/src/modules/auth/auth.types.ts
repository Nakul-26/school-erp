export interface User {
  id: number;
  college_id: number;
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
  name: string;
  email: string;
  phone?: string;
  password_hash: string;
  is_active: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    college_id: number;
  };
  college?: {
    id: number;
    name: string;
  };
}
