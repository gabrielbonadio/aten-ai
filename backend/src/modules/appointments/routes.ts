import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import AppointmentController from './controllers/AppointmentController';
import {
  createAppointmentSchema,
  listAppointmentsSchema,
  updateAppointmentSchema,
  updateAppointmentPaymentSchema,
  updateAppointmentStatusSchema
} from './schemas/appointment.schema';

const appointmentsRoutes = Router();

appointmentsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         tenantId: { type: number }
 *         petId: { type: string, format: uuid }
 *         date: { type: string, format: date-time }
 *         type: { type: string, enum: [VACCINE, CONSULTATION, SURGERY, OTHER] }
 *         status: { type: string, enum: [SCHEDULED, COMPLETED, CANCELED] }
 *         confirmationStatus: { type: string, enum: [PENDING, CONFIRMED, RESCHEDULED] }
 *         assignedUserId: { type: string, format: uuid, nullable: true }
 *         amountCents: { type: integer, nullable: true, description: Valor em centavos }
 *         paymentStatus: { type: string, enum: [PENDING, PAID, WAIVED] }
 *         notes: { type: string, nullable: true }
 *         reminderSentAt: { type: string, format: date-time, nullable: true }
 *         followupSentAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

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
 *               assignedUserId: { type: string, format: uuid, nullable: true }
 *               amountCents: { type: integer, nullable: true }
 *               paymentStatus: { type: string, enum: [PENDING, PAID, WAIVED] }
 *     responses:
 *       201:
 *         description: Agendamento criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Appointment' }
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
 *     summary: Listar agendamentos (filtros por status, datas e responsável)
 *     description: |
 *       Cada item inclui `confirmationStatus` e `assignedUserId` (nullable).
 *       Filtro `assignedUserId`: UUID do profissional ou `me` (usuário autenticado).
 *       Escopo sempre pelo `tenantId` do JWT. Não há GET por id nesta API.
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
 *       - in: query
 *         name: assignedUserId
 *         description: UUID do profissional ou `me`
 *         schema:
 *           oneOf:
 *             - type: string
 *               format: uuid
 *             - type: string
 *               enum: [me]
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [PENDING, PAID, WAIVED] }
 *     responses:
 *       200:
 *         description: Lista paginada de agendamentos (inclui pet e tutor)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Appointment' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: number }
 *                     pageSize: { type: number }
 *                     total: { type: number }
 *                     totalPages: { type: number }
 */
appointmentsRoutes.get('/appointments', validateSchema(listAppointmentsSchema, 'query'), AppointmentController.index);

appointmentsRoutes.put('/appointments/:id', validateSchema(updateAppointmentSchema), AppointmentController.update);

appointmentsRoutes.delete('/appointments/:id', AppointmentController.remove);

/**
 * @openapi
 * /appointments/{id}/status:
 *   patch:
 *     tags: [Appointments]
 *     summary: Atualizar apenas o status do agendamento
 *     description: |
 *       Escopo multi-tenant: o agendamento deve pertencer ao `tenantId` do JWT.
 *       Se não existir no tenant, responde 404 (sem vazar existência entre tenants).
 *       Idempotente quando o status enviado já é o atual.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [SCHEDULED, COMPLETED, CANCELED] }
 *     responses:
 *       200: { description: Agendamento com status atualizado }
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 *       404:
 *         description: Agendamento não encontrado neste tenant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
appointmentsRoutes.patch(
  '/appointments/:id/status',
  validateSchema(updateAppointmentStatusSchema),
  AppointmentController.updateStatus
);

/**
 * @openapi
 * /appointments/{id}/payment:
 *   patch:
 *     tags: [Appointments]
 *     summary: Atualizar valor e/ou status de pagamento
 *     description: |
 *       Caixa mínimo (S7). Escopo pelo `tenantId` do JWT.
 *       Body parcial: `amountCents` e/ou `paymentStatus`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountCents: { type: integer, minimum: 0, nullable: true }
 *               paymentStatus: { type: string, enum: [PENDING, PAID, WAIVED] }
 *     responses:
 *       200: { description: Agendamento atualizado }
 *       404: { description: Agendamento não encontrado neste tenant }
 */
appointmentsRoutes.patch(
  '/appointments/:id/payment',
  validateSchema(updateAppointmentPaymentSchema),
  AppointmentController.updatePayment
);

export default appointmentsRoutes;

