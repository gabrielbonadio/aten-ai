export {};

/**
 * Sobrescrita global do `Express.Request` para incluir o usuário autenticado
 * propagado pelo middleware `ensureAuthenticated`.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: string;
      };
    }
  }
}
