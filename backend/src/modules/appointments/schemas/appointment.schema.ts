import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  type: Joi.string().valid('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER').optional(),
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  notes: Joi.string().allow('', null).optional()
});

export const listAppointmentsSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

export const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').required()
});

export const updateAppointmentSchema = Joi.object({
  petId: Joi.string().uuid().optional(),
  date: Joi.date().iso().optional(),
  type: Joi.string().valid('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER').optional(),
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  notes: Joi.string().allow('', null).optional()
}).min(1);

