import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

class Pet extends Model<InferAttributes<Pet>, InferCreationAttributes<Pet>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare tutorId: string;
  declare name: string;
  declare species: CreationOptional<string | null>;
  declare breed: CreationOptional<string | null>;
  declare birthDate: CreationOptional<Date | null>;
  declare weight: CreationOptional<number | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof Pet {
    Pet.init(
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
        tutorId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        species: {
          type: DataTypes.STRING(80),
          allowNull: true
        },
        breed: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        birthDate: {
          type: DataTypes.DATE,
          allowNull: true
        },
        weight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'pets',
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ['tenantId'], name: 'pets_tenant_id_idx' },
          { fields: ['tutorId'], name: 'pets_tutor_id_idx' }
        ]
      }
    );

    return Pet;
  }
}

export default Pet;

