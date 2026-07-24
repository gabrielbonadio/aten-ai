import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';
import { decryptField, encryptField } from '../../../shared/crypto/fieldEncryption';

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

  /** Criptografa campos clínicos em repouso quando `PII_ENCRYPTION_KEY` está definida. */
  private static encryptClinicalFields(instance: MedicalRecord): void {
    if (instance.changed('symptoms') && instance.symptoms != null) {
      instance.symptoms = encryptField(instance.symptoms) as string;
    }
    if (instance.changed('diagnosis') && instance.diagnosis != null) {
      instance.diagnosis = encryptField(instance.diagnosis) as string;
    }
    if (instance.changed('prescription') && instance.prescription != null) {
      instance.prescription = encryptField(instance.prescription);
    }
  }

  /** Devolve plaintext na aplicação (legado sem prefixo permanece intacto). */
  private static decryptClinicalFields(instance: MedicalRecord): void {
    if (instance.symptoms != null) {
      instance.symptoms = decryptField(instance.symptoms) as string;
    }
    if (instance.diagnosis != null) {
      instance.diagnosis = decryptField(instance.diagnosis) as string;
    }
    if (instance.prescription != null) {
      instance.prescription = decryptField(instance.prescription);
    }
  }

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
        ],
        hooks: {
          beforeCreate: (instance) => MedicalRecord.encryptClinicalFields(instance),
          beforeUpdate: (instance) => MedicalRecord.encryptClinicalFields(instance),
          afterCreate: (instance) => MedicalRecord.decryptClinicalFields(instance),
          afterUpdate: (instance) => MedicalRecord.decryptClinicalFields(instance),
          afterFind: (result) => {
            if (!result) return;

            const decryptMany = (rows: unknown[]) => {
              for (const row of rows) {
                if (row instanceof MedicalRecord) {
                  MedicalRecord.decryptClinicalFields(row);
                }
              }
            };

            if (Array.isArray(result)) {
              decryptMany(result);
              return;
            }

            if (result instanceof MedicalRecord) {
              MedicalRecord.decryptClinicalFields(result);
              return;
            }

            // findAndCountAll → { rows, count }
            if (
              typeof result === 'object' &&
              result !== null &&
              'rows' in result &&
              Array.isArray((result as { rows: unknown[] }).rows)
            ) {
              decryptMany((result as { rows: unknown[] }).rows);
            }
          }
        }
      }
    );

    return MedicalRecord;
  }
}

export default MedicalRecord;

