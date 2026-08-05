import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import TutorController from './controllers/TutorController';
import { createTutorSchema, listTutorsQuerySchema, updateTutorSchema } from './schemas/tutor.schema';

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
tutorsRoutes.post('/tutors', validateSchema(createTutorSchema), TutorController.create);

/**
 * @openapi
 * /tutors:
 *   get:
 *     tags: [Tutors]
 *     summary: Listar tutores (inclui pets). Busca opcional por nome ou e-mail (?search= ou ?q=)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de tutores }
 */
tutorsRoutes.get(
  '/tutors',
  validateSchema(listTutorsQuerySchema, 'query'),
  TutorController.findAll
);

tutorsRoutes.get('/tutors/:id', TutorController.findOne);
tutorsRoutes.put('/tutors/:id', validateSchema(updateTutorSchema), TutorController.update);
tutorsRoutes.delete('/tutors/:id', ensureRole(['ADMIN']), TutorController.remove);

export default tutorsRoutes;
