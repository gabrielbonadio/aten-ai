import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

class Tutor extends Model<InferAttributes<Tutor>, InferCreationAttributes<Tutor>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare name: string;
  declare email: CreationOptional<string | null>;
  declare phone: string;
  declare address: CreationOptional<string | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof Tutor {
    Tutor.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true
        },
        tenantId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true
        },
        phone: {
          type: DataTypes.STRING(32),
          allowNull: false
        },
        address: {
          type: DataTypes.STRING(500),
          allowNull: true
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'tutors',
        timestamps: true,
        paranoid: true,
        indexes: [{ fields: ['tenantId'], name: 'tutors_tenant_id_idx' }]
      }
    );

    return Tutor;
  }
}

export default Tutor;

