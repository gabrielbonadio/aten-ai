import { Router } from 'express';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import AuthController from './controllers/AuthController';
import { loginSchema, signUpSchema } from './schemas/auth.schema';

const authRoutes = Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastro de tenant e primeiro usuário (ADMIN)
 *     description: Cria um Tenant e o usuário administrador na mesma transação.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantName, userName, email, password]
 *             properties:
 *               tenantName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "Minha Empresa"
 *               userName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "Maria Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "maria@empresa.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 format: password
 *                 example: "SenhaSegura123"
 *     responses:
 *       201:
 *         description: Conta criada com sucesso; retorna JWT e dados do usuário e tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT para uso em Authorization Bearer
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, example: "ADMIN" }
 *                     tenantId: { type: number }
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id: { type: number }
 *                     name: { type: string }
 *                     slug: { type: string }
 *       400:
 *         description: Erro de validação (Joi) ou payload inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *             example:
 *               message: "tenantName is required"
 *       409:
 *         description: Conflito (ex. e-mail já cadastrado)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 */
authRoutes.post('/auth/signup', validateSchema(signUpSchema), AuthController.signUp);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login com e-mail e senha
 *     description: Autentica o usuário e retorna um JWT com id, role e tenantId.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "maria@empresa.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SenhaSegura123"
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string }
 *                     tenantId: { type: number }
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id: { type: number }
 *                     name: { type: string }
 *                     slug: { type: string }
 *       400:
 *         description: Erro de validação (Joi)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorMessage'
 */
authRoutes.post('/auth/login', validateSchema(loginSchema), AuthController.login);
authRoutes.get('/auth/me', ensureAuthenticated, AuthController.me);

export default authRoutes;
