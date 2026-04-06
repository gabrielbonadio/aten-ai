import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import Tenant from '../modules/tenants/models/Tenant';
import User from '../modules/auth/models/User';
import Customer from '../modules/customers/models/Customer';

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
Customer.initModel(sequelize);

Tenant.hasMany(User, { foreignKey: 'tenantId', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Customer, { foreignKey: 'tenantId', as: 'customers' });
Customer.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

export default sequelize;
