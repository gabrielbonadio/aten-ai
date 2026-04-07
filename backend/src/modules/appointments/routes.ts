import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import AppointmentController from './controllers/AppointmentController';
import { createAppointmentSchema, listAppointmentsSchema, updateAppointmentStatusSchema } from './schemas/appointment.schema';

const appointmentsRoutes = Router();

appointmentsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * /appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Criar agendamento
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [petId, date]
 *             properties:
 *               petId: { type: string, format: uuid }
 *               date: { type: string, format: date-time }
 *               type: { type: string, enum: [VACCINE, CONSULTATION, SURGERY, OTHER] }
 *               status: { type: string, enum: [SCHEDULED, COMPLETED, CANCELED] }
 *               notes: { type: string, nullable: true }
 *     responses:
 *       201: { description: Agendamento criado }
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
appointmentsRoutes.post('/appointments', validateSchema(createAppointmentSchema), AppointmentController.store);

/**
 * @openapi
 * /appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Listar agendamentos (filtros por status e intervalo de datas)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [SCHEDULED, COMPLETED, CANCELED] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Lista de agendamentos (inclui pet e tutor) }
 */
appointmentsRoutes.get('/appointments', validateSchema(listAppointmentsSchema, 'query'), AppointmentController.index);

appointmentsRoutes.patch(
  '/appointments/:id/status',
  validateSchema(updateAppointmentStatusSchema),
  AppointmentController.updateStatus
);

export default appointmentsRoutes;

