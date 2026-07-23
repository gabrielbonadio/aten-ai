import { Router } from 'express';

/**
 * Rotas administrativas de tenants foram removidas da API pública.
 * - Criação de tenant: POST /auth/signup
 * - Dados da clínica do usuário: GET/PUT /settings
 *
 * Mantemos o router vazio exportado para não quebrar imports legados.
 */
const tenantsRoutes = Router();

export default tenantsRoutes;
