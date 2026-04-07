import Joi from 'joi';

export const createMedicalRecordSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  appointmentId: Joi.string().uuid().allow(null).optional(),
  symptoms: Joi.string().trim().min(1).required(),
  diagnosis: Joi.string().trim().min(1).required(),
  prescription: Joi.string().allow('', null).optional(),
  weight: Joi.number().precision(2).positive().allow(null).optional()
});

export const updateMedicalRecordSchema = Joi.object({
  appointmentId: Joi.string().uuid().allow(null).optional(),
  symptoms: Joi.string().trim().min(1).optional(),
  diagnosis: Joi.string().trim().min(1).optional(),
  prescription: Joi.string().allow('', null).optional(),
  weight: Joi.number().precision(2).positive().allow(null).optional()
}).min(1);

