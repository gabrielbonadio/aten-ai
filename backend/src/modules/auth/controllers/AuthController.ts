import { Request, Response } from 'express';
import authService from '../services/AuthService';

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

  /** Exemplo de rota protegida: expõe o tenant injetado pelo middleware JWT. */
  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({ user: req.user });
  }
}

export default new AuthController();
