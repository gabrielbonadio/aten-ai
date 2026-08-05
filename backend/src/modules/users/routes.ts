import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import UserController from './controllers/UserController';
import { inviteUserSchema, updateUserSchema } from './schemas/user.schema';

const usersRoutes = Router();

usersRoutes.use(ensureAuthenticated);
usersRoutes.use(ensureRole(['ADMIN']));

/**
 * @openapi
 * components:
 *   schemas:
 *     TenantUser:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         role: { type: string, enum: [ADMIN, MEMBER] }
 *         tenantId: { type: number }
 *         active: { type: boolean }
 */

/**
 * @openapi
 * /users/invites:
 *   post:
 *     tags: [Users]
 *     summary: Convidar usuário para o tenant (ADMIN)
 *     description: Cria usuário inactive no tenant do JWT e envia e-mail com token invite. Não cria tenant novo.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [MEMBER, ADMIN], default: MEMBER }
 *     responses:
 *       201:
 *         description: Convite criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TenantUser' }
 *       403: { description: Sem permissão (não ADMIN) }
 *       409: { description: E-mail já existente }
 */
usersRoutes.post('/users/invites', validateSchema(inviteUserSchema), UserController.invite);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuários do tenant (ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Lista sem password_hash
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/TenantUser' }
 */
usersRoutes.get('/users', UserController.index);

/**
 * @openapi
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Atualizar role/active do usuário do tenant (ADMIN)
 *     description: Impede remover ou desativar o último ADMIN ativo do tenant.
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
 *               role: { type: string, enum: [MEMBER, ADMIN] }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TenantUser' }
 *       400: { description: Tentativa de remover o último ADMIN }
 */
usersRoutes.patch('/users/:id', validateSchema(updateUserSchema), UserController.update);

export default usersRoutes;
