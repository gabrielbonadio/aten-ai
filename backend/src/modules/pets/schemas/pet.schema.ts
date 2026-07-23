import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/schemas/pagination.schema';

export const listPetsQuerySchema = Joi.object({
  ...paginationQuerySchema
});

export const createPetSchema = Joi.object({
  tutorId: Joi.string().uuid().required(),
  name: Joi.string().trim().min(1).max(255).required(),
  species: Joi.string().trim().max(80).allow('', null).optional(),
  breed: Joi.string().trim().max(120).allow('', null).optional(),
  birthDate: Joi.date().iso().allow(null).optional(),
  weight: Joi.number().precision(2).positive().allow(null).optional()
});

export const updatePetSchema = Joi.object({
  tutorId: Joi.string().uuid().optional(),
  name: Joi.string().trim().min(1).max(255).optional(),
  species: Joi.string().trim().max(80).allow('', null).optional(),
  breed: Joi.string().trim().max(120).allow('', null).optional(),
  birthDate: Joi.date().iso().allow(null).optional(),
  weight: Joi.number().precision(2).positive().allow(null).optional()
}).min(1);

