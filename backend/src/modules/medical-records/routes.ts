import { Router } from 'express';
import { ensureAuthenticated } from '../../shared/middlewares/ensureAuthenticated';
import { ensureRole } from '../../shared/middlewares/ensureRole';
import { validateSchema } from '../../shared/middlewares/validateSchema';
import MedicalRecordController from './controllers/MedicalRecordController';
import { createMedicalRecordSchema, listMedicalRecordsQuerySchema, updateMedicalRecordSchema } from './schemas/medicalRecord.schema';

const medicalRecordsRoutes = Router();

medicalRecordsRoutes.use(ensureAuthenticated);

/**
 * @openapi
 * components:
 *   schemas:
 *     MedicalRecord:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         tenantId: { type: number }
 *         petId: { type: string, format: uuid }
 *         appointmentId: { type: string, format: uuid, nullable: true }
 *         veterinarianId: { type: string, format: uuid }
 *         symptoms: { type: string }
 *         diagnosis: { type: string }
 *         prescription: { type: string, nullable: true }
 *         weight: { type: number, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /medical-records:
 *   post:
 *     tags: [MedicalRecords]
 *     summary: Criar prontuário médico
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [petId, symptoms, diagnosis]
 *             properties:
 *               petId: { type: string, format: uuid }
 *               appointmentId: { type: string, format: uuid, nullable: true }
 *               symptoms: { type: string }
 *               diagnosis: { type: string }
 *               prescription: { type: string, nullable: true }
 *               weight: { type: number, nullable: true }
 *     responses:
 *       201:
 *         description: Prontuário criado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/MedicalRecord' }
 *       400:
 *         description: Erro de validação
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorMessage' }
 */
medicalRecordsRoutes.post('/medical-records', validateSchema(createMedicalRecordSchema), MedicalRecordController.store);

/**
 * @openapi
 * /pets/{petId}/medical-records:
 *   get:
 *     tags: [MedicalRecords]
 *     summary: Listar histórico médico do pet
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: petId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Lista de prontuários (mais recente primeiro), incluindo veterinário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/MedicalRecord' }
 */
medicalRecordsRoutes.get('/pets/:petId/medical-records', MedicalRecordController.byPet);

medicalRecordsRoutes.get(
  '/medical-records',
  validateSchema(listMedicalRecordsQuerySchema, 'query'),
  MedicalRecordController.index
);
medicalRecordsRoutes.get('/medical-records/:id', MedicalRecordController.show);
medicalRecordsRoutes.put('/medical-records/:id', validateSchema(updateMedicalRecordSchema), MedicalRecordController.update);
medicalRecordsRoutes.delete('/medical-records/:id', ensureRole(['ADMIN']), MedicalRecordController.destroy);

export default medicalRecordsRoutes;

