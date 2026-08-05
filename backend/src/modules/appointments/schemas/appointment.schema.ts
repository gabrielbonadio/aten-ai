import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/schemas/pagination.schema';

const assignedUserIdBody = Joi.string().uuid().allow(null).optional();
const amountCentsBody = Joi.number().integer().min(0).allow(null).optional();
const paymentStatusBody = Joi.string().valid('PENDING', 'PAID', 'WAIVED').optional();

export const createAppointmentSchema = Joi.object({
  petId: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  type: Joi.string().valid('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER').optional(),
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  notes: Joi.string().allow('', null).optional(),
  assignedUserId: assignedUserIdBody,
  amountCents: amountCentsBody,
  paymentStatus: paymentStatusBody
});

export const listAppointmentsSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  paymentStatus: Joi.string().valid('PENDING', 'PAID', 'WAIVED').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  assignedUserId: Joi.alternatives()
    .try(Joi.string().valid('me'), Joi.string().uuid())
    .optional(),
  ...paginationQuerySchema
});

export const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').required()
});

export const updateAppointmentSchema = Joi.object({
  petId: Joi.string().uuid().optional(),
  date: Joi.date().iso().optional(),
  type: Joi.string().valid('VACCINE', 'CONSULTATION', 'SURGERY', 'OTHER').optional(),
  status: Joi.string().valid('SCHEDULED', 'COMPLETED', 'CANCELED').optional(),
  notes: Joi.string().allow('', null).optional(),
  assignedUserId: assignedUserIdBody,
  amountCents: amountCentsBody,
  paymentStatus: paymentStatusBody
}).min(1);

/** PATCH /appointments/:id/payment — só valor/status de pagamento. */
export const updateAppointmentPaymentSchema = Joi.object({
  amountCents: amountCentsBody,
  paymentStatus: paymentStatusBody
}).min(1);
