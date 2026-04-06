import type { Transaction } from 'sequelize';
import User from '../models/User';
import type { UserRole } from '../models/User';

export type CreateUserData = {
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  tenantId: number;
};

class UserRepository {
  async findByEmail(email: string, options?: { transaction?: Transaction }): Promise<User | null> {
    return User.findOne({
      where: { email },
      transaction: options?.transaction
    });
  }

  async create(data: CreateUserData, options?: { transaction?: Transaction }): Promise<User> {
    return User.create(data, { transaction: options?.transaction });
  }
}

export default new UserRepository();
