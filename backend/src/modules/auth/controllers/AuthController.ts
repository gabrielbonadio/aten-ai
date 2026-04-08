import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import authService from '../services/AuthService';
import userRepository from '../repositories/UserRepository';

class AuthController {
  async signUp(req: Request, res: Response): Promise<void> {
    const result = await authService.signUp(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
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
