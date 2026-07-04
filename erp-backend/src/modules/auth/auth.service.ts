import { sign } from 'hono/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { sendEmail } from '../../utils/email';
import { Env, JwtPayload } from '../../types';
import { UserRepository } from '../users/users.repository';
import { InstitutionRepository } from '../institutions/institutions.repository';
import { createAuditLog } from '../../utils/audit';

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private instRepo: InstitutionRepository,
    private env: Env
  ) {}

  async generateToken(user: any): Promise<string> {
    if (!this.env.JWT_SECRET) {
      throw new Error('Server configuration error: JWT_SECRET is not configured');
    }

    const payload: JwtPayload = {
      sub: user.id,
      institution_id: user.institution_id,
      roles: user.roles || [],
      role: user.role || '',
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    };
    return await sign(payload, this.env.JWT_SECRET);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user || !user.is_active) throw new Error('Invalid credentials');

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = await this.generateToken(user);
    
    await createAuditLog(this.env.DB, user.id, 'LOGIN', 'auth', user.id, `User ${user.email} logged in successfully`);

    return {
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        roles: user.roles || [], 
        role: user.role || '', 
        institution_id: user.institution_id 
      },
    };
  }

  async registerInstitution(data: any) {
    const existing = await this.userRepo.findByEmail(data.admin_email);
    if (existing) throw new Error('Email already in use');

    const institutionId = crypto.randomUUID();
    await this.instRepo.create(institutionId, {
      name: data.institution_name,
      address: data.address,
      email: data.contact_email,
      phone: data.contact_phone,
      institution_type: data.institution_type,
    });

    const hash = await hashPassword(data.admin_password);
    const userId = crypto.randomUUID();
    
    await this.userRepo.create(userId, {
      institution_id: institutionId,
      username: data.admin_username,
      email: data.admin_email,
      password_hash: hash,
      name: data.admin_name,
      phone: data.admin_phone,
      roles: ['Principal']
    });

    const user = { id: userId, name: data.admin_name, email: data.admin_email, roles: ['Principal'], role: 'Principal', institution_id: institutionId };
    const token = await this.generateToken(user);

    await createAuditLog(this.env.DB, userId, 'REGISTER_INSTITUTION', 'auth', institutionId, `Registered institution ${data.institution_name} with admin ${data.admin_email}`);

    return { token, user, institution: { id: institutionId, name: data.institution_name } };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (user) {
      const resetToken = crypto.randomUUID();
      const expiry = new Date(Date.now() + 3600000).toISOString();
      await this.userRepo.update(user.id, { reset_token: resetToken, reset_expires: expiry });

      const frontendUrl = this.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      await sendEmail(this.env, {
        to: email,
        subject: 'Password Reset Request',
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
      });
    }
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.userRepo.findByResetToken(token);
    if (!user || !user.reset_expires || new Date(user.reset_expires) < new Date()) {
      throw new Error('Invalid or expired token');
    }

    const hash = await hashPassword(newPass);
    await this.userRepo.update(user.id, { password_hash: hash, reset_token: null, reset_expires: null });
    
    await createAuditLog(this.env.DB, user.id, 'RESET_PASSWORD', 'auth', user.id, `User ${user.email} reset their password successfully`);

    return { message: 'Password reset successfully' };
  }
}
