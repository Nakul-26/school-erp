export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
}

export interface JwtPayload extends Record<string, unknown> {
  sub: string;
  institution_id: string;
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
  email: string;
  name: string;
  exp: number;
}
