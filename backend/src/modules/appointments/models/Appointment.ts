import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type AppointmentType = 'VACCINE' | 'CONSULTATION' | 'SURGERY' | 'OTHER';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';

class Appointment extends Model<InferAttributes<Appointment>, InferCreationAttributes<Appointment>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare petId: string;
  declare date: Date;
  declare type: CreationOptional<AppointmentType>;
  declare status: CreationOptional<AppointmentStatus>;
  declare notes: CreationOptional<string | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;

  static initModel(sequelize: Sequelize): typeof Appointment {
    Appointment.init(
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
        date: {
          type: DataTypes.DATE,
          allowNull: false
        },
        type: {
          type: DataTypes.ENUM('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER'),
          allowNull: false,
          defaultValue: 'CONSULTATION'
        },
        status: {
          type: DataTypes.ENUM('SCHEDULED', 'COMPLETED', 'CANCELED'),
          allowNull: false,
          defaultValue: 'SCHEDULED'
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        deletedAt: DataTypes.DATE
      },
      {
        sequelize,
        tableName: 'appointments',
        timestamps: true,
        paranoid: true,
        indexes: [
          { fields: ['tenantId'], name: 'appointments_tenant_id_idx' },
          { fields: ['petId'], name: 'appointments_pet_id_idx' },
          { fields: ['date'], name: 'appointments_date_idx' }
        ]
      }
    );

    return Appointment;
  }
}

export default Appointment;

