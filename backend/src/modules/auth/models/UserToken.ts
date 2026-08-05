import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type UserTokenPurpose = 'password_reset' | 'refresh' | 'totp_pending' | 'invite';

class UserToken extends Model<InferAttributes<UserToken>, InferCreationAttributes<UserToken>> {
  declare id: CreationOptional<string>;
  declare token: string;
  declare userId: string;
  declare purpose: CreationOptional<UserTokenPurpose>;
  declare expiresAt: Date;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof UserToken {
    UserToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true
        },
        token: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        purpose: {
          type: DataTypes.ENUM('password_reset', 'refresh', 'totp_pending', 'invite'),
          allowNull: false,
          defaultValue: 'password_reset'
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'user_tokens',
        timestamps: true,
        paranoid: true,
        indexes: [
          { unique: true, fields: ['token'], name: 'user_tokens_token_unique' },
          { fields: ['userId'], name: 'user_tokens_user_id_idx' },
          { fields: ['userId', 'purpose'], name: 'user_tokens_user_id_purpose_idx' }
        ]
      }
    );

    return UserToken;
  }
}

export default UserToken;
