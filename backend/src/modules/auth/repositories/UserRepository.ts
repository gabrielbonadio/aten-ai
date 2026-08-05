import { Op, type Transaction } from 'sequelize';
import User from '../models/User';
import type { UserRole } from '../models/User';

export type CreateUserData = {
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  tenantId: number;
  active?: boolean;
};

export type UpdateTotpData = {
  totpSecret?: string | null;
  totpEnabledAt?: Date | null;
  totpRecoveryHashes?: string | null;
};

export type UpdateUserProfileData = {
  name?: string;
  role?: UserRole;
  active?: boolean;
  password_hash?: string;
};

const USER_SAFE_ATTRIBUTES = [
  'id',
  'name',
  'email',
  'role',
  'tenantId',
  'active',
  'createdAt',
  'updatedAt'
] as const;

class UserRepository {
  async findByEmail(email: string, options?: { transaction?: Transaction }): Promise<User | null> {
    return User.findOne({
      where: { email },
      transaction: options?.transaction
    });
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: number,
    options?: { transaction?: Transaction }
  ): Promise<User | null> {
    return User.findOne({
      where: { [Op.and]: [{ email }, { tenantId }] },
      transaction: options?.transaction
    });
  }

  async findById(id: string, options?: { transaction?: Transaction }): Promise<User | null> {
    return User.findByPk(id, { transaction: options?.transaction });
  }

  async findByIdAndTenant(
    id: string,
    tenantId: number,
    options?: { transaction?: Transaction }
  ): Promise<User | null> {
    return User.findOne({
      where: { [Op.and]: [{ id }, { tenantId }] },
      transaction: options?.transaction
    });
  }

  async findAllByTenant(tenantId: number): Promise<User[]> {
    return User.findAll({
      where: { tenantId },
      attributes: [...USER_SAFE_ATTRIBUTES],
      order: [['createdAt', 'ASC']]
    });
  }

  async countActiveAdmins(
    tenantId: number,
    options?: { excludeUserId?: string; transaction?: Transaction }
  ): Promise<number> {
    const where: {
      tenantId: number;
      role: UserRole;
      active: boolean;
      id?: { [Op.ne]: string };
    } = {
      tenantId,
      role: 'ADMIN',
      active: true
    };
    if (options?.excludeUserId) {
      where.id = { [Op.ne]: options.excludeUserId };
    }
    return User.count({
      where,
      transaction: options?.transaction
    });
  }

  async create(data: CreateUserData, options?: { transaction?: Transaction }): Promise<User> {
    return User.create(data, { transaction: options?.transaction });
  }

  async updateById(
    id: string,
    data: UpdateUserProfileData,
    options?: { transaction?: Transaction }
  ): Promise<void> {
    await User.update(data, {
      where: { id },
      transaction: options?.transaction
    });
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
