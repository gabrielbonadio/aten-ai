import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/schemas/pagination.schema';

/** Query string para GET /tutors — busca por nome ou e-mail (opcional) + paginação. */
export const listTutorsQuerySchema = Joi.object({
  search: Joi.string().trim().max(255).allow(''),
  q: Joi.string().trim().max(255).allow(''),
  ...paginationQuerySchema
});

export const createTutorSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(6).max(32).required(),
  address: Joi.string().trim().max(500).allow('', null).optional()
});

export const updateTutorSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  email: Joi.string().trim().email().allow('', null).optional(),
  phone: Joi.string().trim().min(6).max(32).optional(),
  address: Joi.string().trim().max(500).allow('', null).optional()
}).min(1);

