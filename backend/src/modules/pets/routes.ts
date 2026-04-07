import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import PetController from './controllers/PetController';
import { createPetSchema, updatePetSchema } from './schemas/pet.schema';

const petsRoutes = Router();

petsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * /pets:
 *   post:
 *     tags: [Pets]
 *     summary: Criar pet
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tutorId, name]
 *             properties:
 *               tutorId: { type: string, format: uuid }
 *               name: { type: string, example: "Thor" }
 *               species: { type: string, nullable: true, example: "Cachorro" }
 *               breed: { type: string, nullable: true, example: "Labrador" }
 *               birthDate: { type: string, format: date-time, nullable: true }
 *               weight: { type: number, nullable: true, example: 12.5 }
 *     responses:
 *       201: { description: Pet criado }
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
petsRoutes.post('/pets', validateSchema(createPetSchema), PetController.store);

/**
 * @openapi
 * /pets:
 *   get:
 *     tags: [Pets]
 *     summary: Listar pets
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de pets }
 */
petsRoutes.get('/pets', PetController.index);

petsRoutes.get('/pets/:id', PetController.show);
petsRoutes.put('/pets/:id', validateSchema(updatePetSchema), PetController.update);
petsRoutes.delete('/pets/:id', ensureRole(['ADMIN']), PetController.destroy);

export default petsRoutes;

