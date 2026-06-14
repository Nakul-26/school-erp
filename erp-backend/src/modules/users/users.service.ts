import { UserRepository } from './users.repository';
import { User, CreateUserInput, UpdateUserInput } from './users.types';
import { generatePassword, hashPassword } from '../../utils/password';

export class UserService {
  constructor(private repo: UserRepository) {}

  async createUser(input: CreateUserInput & { password?: string }, userId?: string): Promise<string> {
    const id = crypto.randomUUID();
    const password = input.password || generatePassword();
    const password_hash = await hashPassword(password);
    
    // Check if username/email exists
    const existingEmail = await this.repo.findByEmail(input.email);
    if (existingEmail) throw new Error('Email already exists');
    
    const existingUsername = await this.repo.findByUsername(input.username);
    if (existingUsername) throw new Error('Username already exists');

    await this.repo.create(id, { ...input, password_hash }, userId);
    return id;
  }

  async getUser(id: string): Promise<User | null> {
    return await this.repo.findById(id);
  }

  async updateUser(id: string, input: UpdateUserInput, userId?: string): Promise<void> {
    await this.repo.update(id, input, userId);
  }

  async deleteUser(id: string, userId?: string): Promise<void> {
    await this.repo.softDelete(id, userId);
  }

  async listUsers(institution_id: string): Promise<User[]> {
    return await this.repo.listByInstitution(institution_id);
  }
}
