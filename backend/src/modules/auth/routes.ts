import { Router } from 'express';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import {
  authRateLimiter,
  passwordResetRateLimiter
} from '../../shared/middlewares/rateLimit';
import AuthController from './controllers/AuthController';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signUpSchema
} from './schemas/auth.schema';

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
 *                 example: "SenhaSegura@123"
 *     responses:
 *       201:
 *         description: Conta criada com sucesso; retorna JWT, refreshToken e dados do usuário e tenant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT (access) para uso em Authorization Bearer
 *                 refreshToken:
 *                   type: string
 *                   description: Token opaco de longa duração para /auth/refresh
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
authRoutes.post(
  '/auth/signup',
  authRateLimiter,
  validateSchema(signUpSchema),
  AuthController.signUp
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login com e-mail e senha
 *     description: Autentica o usuário e retorna access JWT + refreshToken.
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
 *                 example: "SenhaSegura@123"
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *       400:
 *         description: Erro de validação (Joi)
 *       401:
 *         description: Credenciais inválidas
 */
authRoutes.post(
  '/auth/login',
  authRateLimiter,
  validateSchema(loginSchema),
  AuthController.login
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar recuperação de senha
 *     description: Sempre retorna sucesso (evita vazamento se o e-mail existe ou não).
 */
authRoutes.post(
  '/auth/forgot-password',
  passwordResetRateLimiter,
  validateSchema(forgotPasswordSchema),
  AuthController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Redefinir senha usando token
 */
authRoutes.post(
  '/auth/reset-password',
  passwordResetRateLimiter,
  validateSchema(resetPasswordSchema),
  AuthController.resetPassword
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token com refresh token (rotação)
 */
authRoutes.post(
  '/auth/refresh',
  authRateLimiter,
  validateSchema(refreshTokenSchema),
  AuthController.refresh
);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revogar refresh token (logout server-side)
 */
authRoutes.post(
  '/auth/logout',
  authRateLimiter,
  validateSchema(logoutSchema),
  AuthController.logout
);

authRoutes.get('/auth/me', ensureAuthenticated, AuthController.me);

export default authRoutes;
