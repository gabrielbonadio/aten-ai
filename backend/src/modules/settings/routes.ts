import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import SettingsController from './controllers/SettingsController';
import { updateTenantSettingsSchema } from './schemas/settings.schema';

const settingsRoutes = Router();

settingsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Dados da clínica (tenant do usuário logado)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Tenant }
 */
settingsRoutes.get('/settings', SettingsController.show);

/**
 * @openapi
 * /settings:
 *   put:
 *     tags: [Settings]
 *     summary: Atualizar dados cadastrais da clínica
 *     security: [{ bearerAuth: [] }]
 */
settingsRoutes.put('/settings', validateSchema(updateTenantSettingsSchema), SettingsController.update);

export default settingsRoutes;
