import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import CustomerController from './controllers/CustomerController';
import { createCustomerSchema } from './schemas/customer.schema';

const customersRoutes = Router();

customersRoutes.use(ensureAuthenticated);

customersRoutes.get('/customers', CustomerController.index);
customersRoutes.post('/customers', validateSchema(createCustomerSchema), CustomerController.store);
customersRoutes.delete(
  '/customers/:id',
  ensureRole(['ADMIN']),
  CustomerController.destroy
);

export default customersRoutes;
