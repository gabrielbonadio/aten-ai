import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

class MedicalRecord extends Model<InferAttributes<MedicalRecord>, InferCreationAttributes<MedicalRecord>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare petId: string;
  declare appointmentId: CreationOptional<string | null>;
  declare veterinarianId: string;
  declare symptoms: string;
  declare diagnosis: string;
  declare prescription: CreationOptional<string | null>;
  declare weight: CreationOptional<number | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof MedicalRecord {
    MedicalRecord.init(
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
        appointmentId: {
          type: DataTypes.UUID,
          allowNull: true,
          unique: true
        },
        veterinarianId: {
          type: DataTypes.UUID,
          allowNull: false
        },
        symptoms: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        diagnosis: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        prescription: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        weight: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'medical_records',
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ['tenantId'], name: 'medical_records_tenant_id_idx' },
          { fields: ['petId'], name: 'medical_records_pet_id_idx' },
          { fields: ['veterinarianId'], name: 'medical_records_vet_id_idx' },
          { unique: true, fields: ['appointmentId'], name: 'medical_records_appointment_id_unique' }
        ]
      }
    );

    return MedicalRecord;
  }
}

export default MedicalRecord;

