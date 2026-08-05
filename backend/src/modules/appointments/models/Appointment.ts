import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export type AppointmentType = 'VACCINE' | 'CONSULTATION' | 'SURGERY' | 'OTHER';
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED';
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'RESCHEDULED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'WAIVED';

class Appointment extends Model<InferAttributes<Appointment>, InferCreationAttributes<Appointment>> {
  declare id: CreationOptional<string>;
  declare tenantId: number;
  declare petId: string;
  declare date: Date;
  declare type: CreationOptional<AppointmentType>;
  declare status: CreationOptional<AppointmentStatus>;
  declare notes: CreationOptional<string | null>;
  declare confirmationStatus: CreationOptional<ConfirmationStatus>;
  declare assignedUserId: CreationOptional<string | null>;
  declare amountCents: CreationOptional<number | null>;
  declare paymentStatus: CreationOptional<PaymentStatus>;
  declare reminderSentAt: CreationOptional<Date | null>;
  declare followupSentAt: CreationOptional<Date | null>;

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
        confirmationStatus: {
          type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'RESCHEDULED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        assignedUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          defaultValue: null
        },
        amountCents: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        paymentStatus: {
          type: DataTypes.ENUM('PENDING', 'PAID', 'WAIVED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        reminderSentAt: {
          type: DataTypes.DATE,
          allowNull: true
        },
        followupSentAt: {
          type: DataTypes.DATE,
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
          { fields: ['date'], name: 'appointments_date_idx' },
          { fields: ['confirmationStatus'], name: 'appointments_confirmation_status_idx' },
          { fields: ['reminderSentAt'], name: 'appointments_reminder_sent_at_idx' },
          { fields: ['followupSentAt'], name: 'appointments_followup_sent_at_idx' },
          {
            fields: ['tenantId', 'assignedUserId', 'date'],
            name: 'appointments_tenant_assigned_user_date_idx'
          },
          {
            fields: ['tenantId', 'paymentStatus', 'date'],
            name: 'appointments_tenant_payment_status_date_idx'
          }
        ]
      }
    );

    return Appointment;
  }
}

export default Appointment;

