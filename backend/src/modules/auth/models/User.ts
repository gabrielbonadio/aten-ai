import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type UserRole = 'ADMIN' | 'MEMBER';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare role: CreationOptional<UserRole>;
  declare tenantId: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        role: {
          type: DataTypes.ENUM('ADMIN', 'MEMBER'),
          allowNull: false,
          defaultValue: 'ADMIN'
        },
        tenantId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'users',
        timestamps: true,
        paranoid: true,
        indexes: [{ unique: true, fields: ['email'], name: 'users_email_unique' }]
      }
    );

    return User;
  }
}

export default User;
