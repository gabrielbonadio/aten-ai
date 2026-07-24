import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import authService from '../services/AuthService';
import userRepository from '../repositories/UserRepository';
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies
} from '../utils/authCookies';

function resolveRefreshToken(req: Request): string | null {
  const fromBody = (req.body as { refreshToken?: unknown })?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.trim().length >= 32) {
    return fromBody.trim();
  }
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.trim().length >= 32) {
    return fromCookie.trim();
  }
  return null;
}

class AuthController {
  async signUp(req: Request, res: Response): Promise<void> {
    const result = await authService.signUp(req.body);
    setAuthCookies(res, result.token, result.refreshToken);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.token, result.refreshToken);
    res.status(200).json(result);
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email: string };
    await authService.forgotPassword(email);
    res.status(204).send();
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);
    res.status(204).send();
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = resolveRefreshToken(req);
    if (!refreshToken) {
      throw new AppError('Refresh token não informado.', 401);
    }
    const result = await authService.refresh(refreshToken);
    setAuthCookies(res, result.token, result.refreshToken);
    res.status(200).json(result);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = resolveRefreshToken(req);
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    res.status(204).send();
  }

  /** Dados do usuário autenticado (nome, e-mail, papel) para o portal. */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.user?.id;
      if (!id) {
        throw new AppError('Usuário não autenticado.', 401);
      }
      const row = await userRepository.findById(id);
      if (!row) {
        throw new AppError('Usuário não encontrado.', 404);
      }
      res.status(200).json({
        user: {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          tenantId: row.tenantId
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new AuthController();
