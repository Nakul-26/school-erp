export interface Env {
  ASSETS?: Fetcher;
  DB: D1Database;
  FILES: R2Bucket;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  FRONTEND_URL?: string;
}

export interface JwtPayload extends Record<string, unknown> {
  sub: string;
  institution_id: string;
  roles: string[];
  role?: string;
  permissions?: string[];
  email: string;
  name: string;
  exp: number;
}
