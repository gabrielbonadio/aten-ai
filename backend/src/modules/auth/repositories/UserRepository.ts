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

export type UpdateTotpData = {
  totpSecret?: string | null;
  totpEnabledAt?: Date | null;
  totpRecoveryHashes?: string | null;
};

class UserRepository {
  async findByEmail(email: string, options?: { transaction?: Transaction }): Promise<User | null> {
    return User.findOne({
      where: { email },
      transaction: options?.transaction
    });
  }

  async findById(id: string, options?: { transaction?: Transaction }): Promise<User | null> {
    return User.findByPk(id, { transaction: options?.transaction });
  }

  async create(data: CreateUserData, options?: { transaction?: Transaction }): Promise<User> {
    return User.create(data, { transaction: options?.transaction });
  }

  async updatePasswordHash(id: string, password_hash: string, options?: { transaction?: Transaction }): Promise<void> {
    await User.update(
      { password_hash },
      {
        where: { id },
        transaction: options?.transaction
      }
    );
  }

  async updateTotp(id: string, data: UpdateTotpData, options?: { transaction?: Transaction }): Promise<void> {
    await User.update(data, {
      where: { id },
      transaction: options?.transaction
    });
  }

  async clearTotp(id: string, options?: { transaction?: Transaction }): Promise<void> {
    await this.updateTotp(
      id,
      { totpSecret: null, totpEnabledAt: null, totpRecoveryHashes: null },
      options
    );
  }
}

export default new UserRepository();
