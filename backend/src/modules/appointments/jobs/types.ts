import type Pet from '../../pets/models/Pet';
import type Tenant from '../../tenants/models/Tenant';
import type Tutor from '../../tutors/models/Tutor';
import type Appointment from '../models/Appointment';

/**
 * Alias compartilhado entre os jobs do módulo Appointments.
 *
 * Sequelize 6 não tipa eager loads no retorno de `Model.findAll`, então
 * precisamos de uma asserção de tipo controlada quando consumimos
 * relações por `include`. Centralizar essa shape evita drift entre jobs
 * (reminder, follow-up, etc.) e impede que cada arquivo crie a sua versão
 * levemente diferente do mesmo conceito.
 */
export type AppointmentWithRelations = Appointment & {
  tenant?: Tenant;
  pet?: Pet & { tutor?: Tutor };
};
