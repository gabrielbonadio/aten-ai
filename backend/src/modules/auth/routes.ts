import { Router } from 'express';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import {
  authRateLimiter,
  passwordResetRateLimiter
} from '../../shared/middlewares/rateLimit';
import AuthController from './controllers/AuthController';
import {
  forgotPasswordSchema,
  loginSchema,
  loginTotpSchema,
  logoutSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signUpSchema,
  totpConfirmSchema,
  totpDisableSchema,
  totpRegenerateSchema
} from './schemas/auth.schema';

const authRoutes = Router();
const adminOnly = [ensureAuthenticated, ensureRole(['ADMIN'])];

authRoutes.post(
  '/auth/signup',
  authRateLimiter,
  validateSchema(signUpSchema),
  AuthController.signUp
);

authRoutes.post(
  '/auth/login',
  authRateLimiter,
  validateSchema(loginSchema),
  AuthController.login
);

authRoutes.post(
  '/auth/login/totp',
  authRateLimiter,
  validateSchema(loginTotpSchema),
  AuthController.loginTotp
);

authRoutes.post(
  '/auth/forgot-password',
  passwordResetRateLimiter,
  validateSchema(forgotPasswordSchema),
  AuthController.forgotPassword
);

authRoutes.post(
  '/auth/reset-password',
  passwordResetRateLimiter,
  validateSchema(resetPasswordSchema),
  AuthController.resetPassword
);

authRoutes.post(
  '/auth/refresh',
  authRateLimiter,
  validateSchema(refreshTokenSchema),
  AuthController.refresh
);

authRoutes.post(
  '/auth/logout',
  authRateLimiter,
  validateSchema(logoutSchema),
  AuthController.logout
);

authRoutes.get('/auth/me', ensureAuthenticated, AuthController.me);

authRoutes.get('/auth/totp/status', ...adminOnly, AuthController.totpStatus);
authRoutes.post('/auth/totp/setup', ...adminOnly, AuthController.totpSetup);
authRoutes.post(
  '/auth/totp/confirm',
  ...adminOnly,
  validateSchema(totpConfirmSchema),
  AuthController.totpConfirm
);
authRoutes.post(
  '/auth/totp/disable',
  ...adminOnly,
  validateSchema(totpDisableSchema),
  AuthController.totpDisable
);
authRoutes.post(
  '/auth/totp/recovery/regenerate',
  ...adminOnly,
  validateSchema(totpRegenerateSchema),
  AuthController.totpRegenerateRecovery
);

export default authRoutes;
