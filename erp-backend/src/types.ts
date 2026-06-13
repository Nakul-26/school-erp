export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
}

export interface JwtPayload {
  sub: number;
  college_id: number;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  email: string;
  name: string;
  exp: number;
}
