import type { Transaction } from 'sequelize';
import UserToken, { type UserTokenPurpose } from '../models/UserToken';

export type CreateUserTokenData = {
  token: string;
  userId: string;
  expiresAt: Date;
  purpose: UserTokenPurpose;
};

class UserTokenRepository {
  async create(data: CreateUserTokenData, options?: { transaction?: Transaction }): Promise<UserToken> {
    return UserToken.create(data, { transaction: options?.transaction });
  }

  async findByToken(
    token: string,
    purpose?: UserTokenPurpose,
    options?: { transaction?: Transaction }
  ): Promise<UserToken | null> {
    return UserToken.findOne({
      where: purpose ? { token, purpose } : { token },
      transaction: options?.transaction
    });
  }

  async deleteById(id: string, options?: { transaction?: Transaction }): Promise<void> {
    await UserToken.destroy({
      where: { id },
      transaction: options?.transaction
    });
  }

  async deleteByUserIdAndPurpose(
    userId: string,
    purpose: UserTokenPurpose,
    options?: { transaction?: Transaction }
  ): Promise<void> {
    await UserToken.destroy({
      where: { userId, purpose },
      transaction: options?.transaction
    });
  }
}

export default new UserTokenRepository();
