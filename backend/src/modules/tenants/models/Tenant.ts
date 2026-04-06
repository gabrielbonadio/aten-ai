import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type TenantPlan = 'free' | 'pro';
export type TenantStatus = 'active' | 'inactive';

class Tenant extends Model<InferAttributes<Tenant>, InferCreationAttributes<Tenant>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: string;
  declare plan: CreationOptional<TenantPlan>;
  declare status: CreationOptional<TenantStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof Tenant {
    Tenant.init(
      {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        slug: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: true
        },
        plan: {
          type: DataTypes.ENUM('free', 'pro'),
          allowNull: false,
          defaultValue: 'free'
        },
        status: {
          type: DataTypes.ENUM('active', 'inactive'),
          allowNull: false,
          defaultValue: 'active'
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'tenants',
        timestamps: true,
        paranoid: true,
        indexes: [{ unique: true, fields: ['slug'], name: 'tenants_slug_unique' }]
      }
    );

    return Tenant;
  }
}

export default Tenant;

