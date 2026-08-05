import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

class PetVaccination extends Model<InferAttributes<PetVaccination>, InferCreationAttributes<PetVaccination>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare petId: string;
  declare name: string;
  declare appliedAt: CreationOptional<Date | null>;
  declare nextDueAt: Date;
  declare reminderSentAt: CreationOptional<Date | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof PetVaccination {
    PetVaccination.init(
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
        petId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        appliedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null
        },
        nextDueAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        reminderSentAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: null
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'pet_vaccinations',
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ['tenantId'], name: 'pet_vaccinations_tenant_id_idx' },
          { fields: ['petId'], name: 'pet_vaccinations_pet_id_idx' },
          { fields: ['nextDueAt'], name: 'pet_vaccinations_next_due_at_idx' },
          { fields: ['reminderSentAt'], name: 'pet_vaccinations_reminder_sent_at_idx' },
          { fields: ['tenantId', 'nextDueAt'], name: 'pet_vaccinations_tenant_next_due_idx' }
        ]
      }
    );

    return PetVaccination;
  }
}

export default PetVaccination;
