import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Tenant from '../modules/tenants/models/Tenant';
import User from '../modules/auth/models/User';
import UserToken from '../modules/auth/models/UserToken';
import Customer from '../modules/customers/models/Customer';
import Tutor from '../modules/tutors/models/Tutor';
import Pet from '../modules/pets/models/Pet';
import Appointment from '../modules/appointments/models/Appointment';
import MedicalRecord from '../modules/medical-records/models/MedicalRecord';

// Carrega as variáveis de ambiente
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASS as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    logging: false, // Desliga os logs das queries no terminal (podemos ligar depois para debug)
    pool: {
      max: 5,        // Máximo de conexões simultâneas
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

Tenant.initModel(sequelize);
User.initModel(sequelize);
UserToken.initModel(sequelize);
Customer.initModel(sequelize);
Tutor.initModel(sequelize);
Pet.initModel(sequelize);
Appointment.initModel(sequelize);
MedicalRecord.initModel(sequelize);

Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

User.hasMany(UserToken, { foreignKey: 'userId', as: 'tokens' });
UserToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Tenant.hasMany(Customer, { foreignKey: 'tenantId', as: 'customers' });
Customer.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Tutor, { foreignKey: 'tenantId', as: 'tutors' });
Tutor.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Pet, { foreignKey: 'tenantId', as: 'pets' });
Pet.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tutor.hasMany(Pet, { foreignKey: 'tutorId', as: 'pets' });
Pet.belongsTo(Tutor, { foreignKey: 'tutorId', as: 'tutor' });

Tenant.hasMany(Appointment, { foreignKey: 'tenantId', as: 'appointments' });
Appointment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Pet.hasMany(Appointment, { foreignKey: 'petId', as: 'appointments' });
Appointment.belongsTo(Pet, { foreignKey: 'petId', as: 'pet' });

Tenant.hasMany(MedicalRecord, { foreignKey: 'tenantId', as: 'medicalRecords' });
MedicalRecord.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Pet.hasMany(MedicalRecord, { foreignKey: 'petId', as: 'medicalRecords' });
MedicalRecord.belongsTo(Pet, { foreignKey: 'petId', as: 'pet' });

Appointment.hasOne(MedicalRecord, { foreignKey: 'appointmentId', as: 'medicalRecord' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

User.hasMany(MedicalRecord, { foreignKey: 'veterinarianId', as: 'medicalRecords' });
MedicalRecord.belongsTo(User, { foreignKey: 'veterinarianId', as: 'veterinarian' });

export default sequelize;
