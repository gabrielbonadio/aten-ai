import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import PetVaccinationController from './controllers/PetVaccinationController';
import {
  createPetVaccinationByPetSchema,
  createPetVaccinationSchema,
  listPetVaccinationsByPetSchema,
  listPetVaccinationsSchema,
  updatePetVaccinationSchema
} from './schemas/petVaccination.schema';

const petVaccinationsRoutes = Router();

petVaccinationsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * components:
 *   schemas:
 *     PetVaccination:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         tenantId: { type: number }
 *         petId: { type: string, format: uuid }
 *         name: { type: string }
 *         appliedAt: { type: string, format: date-time, nullable: true }
 *         nextDueAt: { type: string, format: date-time }
 *         reminderSentAt: { type: string, format: date-time, nullable: true }
 */

/**
 * @openapi
 * /pets/{petId}/vaccinations:
 *   get:
 *     tags: [PetVaccinations]
 *     summary: Listar vacinações do pet
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lista paginada }
 *   post:
 *     tags: [PetVaccinations]
 *     summary: Registrar vacina no pet (petId na URL)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, appliedAt]
 *             properties:
 *               name: { type: string }
 *               appliedAt: { type: string, format: date-time }
 *               nextDueAt: { type: string, format: date-time, nullable: true }
 *     responses:
 *       201: { description: Vacina criada }
 */
petVaccinationsRoutes.get(
  '/pets/:petId/vaccinations',
  validateSchema(listPetVaccinationsByPetSchema, 'query'),
  PetVaccinationController.indexByPet
);

petVaccinationsRoutes.post(
  '/pets/:petId/vaccinations',
  validateSchema(createPetVaccinationByPetSchema),
  PetVaccinationController.storeForPet
);

/**
 * @openapi
 * /pet-vaccinations:
 *   post:
 *     tags: [PetVaccinations]
 *     summary: Registrar vacinação (petId no body)
 *     security: [{ bearerAuth: [] }]
 */
petVaccinationsRoutes.post(
  '/pet-vaccinations',
  validateSchema(createPetVaccinationSchema),
  PetVaccinationController.store
);

petVaccinationsRoutes.get(
  '/pet-vaccinations',
  validateSchema(listPetVaccinationsSchema, 'query'),
  PetVaccinationController.index
);

petVaccinationsRoutes.get('/pet-vaccinations/:id', PetVaccinationController.show);

petVaccinationsRoutes.put(
  '/pet-vaccinations/:id',
  validateSchema(updatePetVaccinationSchema),
  PetVaccinationController.update
);

petVaccinationsRoutes.delete(
  '/pet-vaccinations/:id',
  ensureRole(['ADMIN']),
  PetVaccinationController.destroy
);

export default petVaccinationsRoutes;
