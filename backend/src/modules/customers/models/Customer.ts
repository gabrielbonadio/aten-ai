import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

class Customer extends Model<InferAttributes<Customer>, InferCreationAttributes<Customer>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare phone: CreationOptional<string | null>;
  declare tenantId: number;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof Customer {
    Customer.init(
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
          allowNull: false
        },
        phone: {
          type: DataTypes.STRING(32),
          allowNull: true
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
        tableName: 'customers',
        timestamps: true,
        paranoid: true,
        indexes: [{ fields: ['tenantId'], name: 'customers_tenant_id_idx' }]
      }
    );

    return Customer;
  }
}

export default Customer;
