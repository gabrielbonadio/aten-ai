import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type TenantPlan = 'free' | 'pro';
export type TenantStatus = 'active' | 'inactive';

class Tenant extends Model<InferAttributes<Tenant>, InferCreationAttributes<Tenant>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: string;
  /** CNPJ ou documento fiscal (opcional). */
  declare document: CreationOptional<string | null>;
  declare phone: CreationOptional<string | null>;
  declare address: CreationOptional<string | null>;
  declare email: CreationOptional<string | null>;
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
        document: {
          type: DataTypes.STRING(18),
          allowNull: true
        },
        phone: {
          type: DataTypes.STRING(32),
          allowNull: true
        },
        address: {
          type: DataTypes.STRING(500),
          allowNull: true
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true
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

