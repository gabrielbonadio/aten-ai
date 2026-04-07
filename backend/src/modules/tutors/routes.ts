import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import TutorController from './controllers/TutorController';
import { createTutorSchema, updateTutorSchema } from './schemas/tutor.schema';

const tutorsRoutes = Router();

tutorsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * /tutors:
 *   post:
 *     tags: [Tutors]
 *     summary: Criar tutor
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone]
 *             properties:
 *               name: { type: string, example: "João Souza" }
 *               email: { type: string, format: email, nullable: true, example: "joao@email.com" }
 *               phone: { type: string, example: "+55 11 99999-9999" }
 *     responses:
 *       201: { description: Tutor criado }
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
tutorsRoutes.post('/tutors', validateSchema(createTutorSchema), TutorController.store);

/**
 * @openapi
 * /tutors:
 *   get:
 *     tags: [Tutors]
 *     summary: Listar tutores (inclui pets)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de tutores }
 */
tutorsRoutes.get('/tutors', TutorController.index);

tutorsRoutes.get('/tutors/:id', TutorController.show);
tutorsRoutes.put('/tutors/:id', validateSchema(updateTutorSchema), TutorController.update);
tutorsRoutes.delete('/tutors/:id', ensureRole(['ADMIN']), TutorController.destroy);

export default tutorsRoutes;

