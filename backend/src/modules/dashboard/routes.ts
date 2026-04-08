import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import DashboardController from './controllers/DashboardController';

const dashboardRoutes = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Métricas principais da clínica
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Métricas consolidadas do tenant e últimos agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPets: { type: number, example: 42 }
 *                 totalTutors: { type: number, example: 18 }
 *                 appointmentsToday: { type: number, example: 5 }
 *                 recentAppointments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       petId: { type: string, format: uuid }
 *                       tenantId: { type: number }
 *                       date: { type: string, format: date-time }
 *                       type: { type: string }
 *                       status: { type: string }
 *                       pet:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           tutor:
 *                             type: object
 *                             properties:
 *                               id: { type: string, format: uuid }
 *                               name: { type: string }
 *                               phone: { type: string }
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 *       403:
 *         description: Sem permissão
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
dashboardRoutes.get('/dashboard', ensureAuthenticated, ensureRole(['ADMIN']), DashboardController.show);

dashboardRoutes.get('/dashboard/metrics', ensureAuthenticated, DashboardController.metrics);

export default dashboardRoutes;

