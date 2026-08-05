import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/schemas/pagination.schema';

export const createPetVaccinationSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  name: Joi.string().trim().min(1).max(255).required(),
  appliedAt: Joi.date().iso().allow(null).optional(),
  nextDueAt: Joi.date().iso().required()
});

/**
 * POST /pets/:petId/vaccinations — contrato do portal (petId na URL).
 * `nextDueAt` pode vir null; o service deriva default se ausente.
 */
export const createPetVaccinationByPetSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  appliedAt: Joi.date().iso().required(),
  nextDueAt: Joi.date().iso().allow(null).optional()
});

export const updatePetVaccinationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  appliedAt: Joi.date().iso().allow(null).optional(),
  nextDueAt: Joi.date().iso().optional()
}).min(1);

export const listPetVaccinationsSchema = Joi.object({
  petId: Joi.string().uuid().optional(),
  ...paginationQuerySchema
});

export const listPetVaccinationsByPetSchema = Joi.object({
  ...paginationQuerySchema
});
