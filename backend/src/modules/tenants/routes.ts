import { Router } from 'express';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import TenantController from './controllers/TenantController';
import { createTenantSchema } from './schemas/tenant.schema';

const tenantsRoutes = Router();

tenantsRoutes.get('/tenants', TenantController.index);
tenantsRoutes.post('/tenants', validateSchema(createTenantSchema), TenantController.store);

export default tenantsRoutes;
