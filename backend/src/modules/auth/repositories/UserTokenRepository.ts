import type { Transaction } from 'sequelize';
import UserToken from '../models/UserToken';

export type CreateUserTokenData = {
  token: string;
  userId: string;
  expiresAt: Date;
};

class UserTokenRepository {
  async create(data: CreateUserTokenData, options?: { transaction?: Transaction }): Promise<UserToken> {
    return UserToken.create(data, { transaction: options?.transaction });
  }

  async findByToken(token: string, options?: { transaction?: Transaction }): Promise<UserToken | null> {
    return UserToken.findOne({
      where: { token },
      transaction: options?.transaction
    });
  }

  async deleteById(id: string, options?: { transaction?: Transaction }): Promise<void> {
    await UserToken.destroy({
      where: { id },
      transaction: options?.transaction
    });
  }
}

export default new UserTokenRepository();

