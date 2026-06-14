import { sign } from 'hono/jwt';
import { AuthRepository } from './auth.repository';
import { hashPassword, verifyPassword } from '../../utils/password';
import { sendEmail } from '../../utils/email';
import { Env, JwtPayload } from '../../types';

const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class AuthService {
  constructor(private repo: AuthRepository, private env: Env) {}

  async generateToken(user: any): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      college_id: user.college_id,
      role: user.role,
      email: user.email,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    };
    return await sign(payload, this.env.JWT_SECRET);
  }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user || !user.is_active) throw new Error('Invalid credentials');

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = await this.generateToken(user);
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, college_id: user.college_id },
    };
  }

  async registerCollege(data: any) {
    const existing = await this.repo.findByEmail(data.admin_email);
    if (existing) throw new Error('Email already in use');

    const collegeId = await this.repo.createCollege(data.college_name, data.address, data.contact_email, data.contact_phone);
    const hash = await hashPassword(data.admin_password);
    
    const userId = await this.repo.createUser({
      college_id: collegeId,
      role: 'admin',
      name: data.admin_name,
      email: data.admin_email,
      password_hash: hash,
    });

    const user = { id: userId, name: data.admin_name, email: data.admin_email, role: 'admin', college_id: collegeId };
    const token = await this.generateToken(user);

    return { token, user, college: { id: collegeId, name: data.college_name } };
  }

  async forgotPassword(email: string) {
    const user = await this.repo.findByEmail(email);
    if (user) {
      const resetToken = crypto.randomUUID();
      const expiry = new Date(Date.now() + 3600000).toISOString();
      await this.repo.setResetToken(user.id, resetToken, expiry);

      const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
      await sendEmail(this.env, {
        to: email,
        subject: 'Password Reset Request',
        html: `<p>Hi ${user.name},</p><p>Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
      });
    }
    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.repo.findByResetToken(token);
    // @ts-ignore
    if (!user || new Date(user.reset_expires) < new Date()) {
      throw new Error('Invalid or expired token');
    }

    const hash = await hashPassword(newPass);
    await this.repo.updatePassword(user.id, hash);
    await this.repo.clearResetToken(user.id);
    return { message: 'Password reset successfully' };
  }
}
