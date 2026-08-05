import { Router } from 'express';

import authRoutes from './modules/auth/routes';
import appointmentsRoutes from './modules/appointments/routes';
import petsRoutes from './modules/pets/routes';
import medicalRecordsRoutes from './modules/medical-records/routes';
import dashboardRoutes from './modules/dashboard/routes';
import tenantsRoutes from './modules/tenants/routes';
import settingsRoutes from './modules/settings/routes';
import tutorsRoutes from './modules/tutors/routes';
import conversationsRoutes from './modules/conversations/routes';
import usersRoutes from './modules/users/routes';
import petVaccinationsRoutes from './modules/pet-vaccinations/routes';

const routes = Router();

routes.use(authRoutes);
routes.use(usersRoutes);
routes.use(appointmentsRoutes);
routes.use(medicalRecordsRoutes);
routes.use(dashboardRoutes);
routes.use(tutorsRoutes);
routes.use(petsRoutes);
routes.use(petVaccinationsRoutes);
routes.use(tenantsRoutes);
routes.use(settingsRoutes);
routes.use('/api/v1', conversationsRoutes);

export default routes;

