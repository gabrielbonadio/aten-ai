import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../../shared/utils/pagination';
import appointmentService from '../services/AppointmentService';
import type { AppointmentStatus, AppointmentType, PaymentStatus } from '../models/Appointment';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

function resolveAuthenticatedUserId(req: Request): string {
  const id = req.user?.id;
  if (!id) throw new AppError('Não autenticado.', 401);
  return id;
}

/** Converte query `assignedUserId=me|<uuid>` para UUID do filtro. */
function resolveAssignedUserFilter(req: Request): string | undefined {
  const raw = req.query.assignedUserId;
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  if (raw === 'me') return resolveAuthenticatedUserId(req);
  return raw;
}

class AppointmentController {
  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { petId, date, type, status, notes, assignedUserId, amountCents, paymentStatus } =
      req.body as {
        petId: string;
        date: string | Date;
        type?: AppointmentType;
        status?: AppointmentStatus;
        notes?: string | null;
        assignedUserId?: string | null;
        amountCents?: number | null;
        paymentStatus?: PaymentStatus;
      };

    const appointment = await appointmentService.create(
      {
        petId,
        date: new Date(date),
        type,
        status,
        notes,
        assignedUserId,
        amountCents,
        paymentStatus
      },
      tenantId
    );

    res.status(201).json(appointment);
  }

  async update(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do agendamento inválido.', 400);

    const { petId, date, type, status, notes, assignedUserId, amountCents, paymentStatus } =
      req.body as {
        petId?: string;
        date?: string | Date;
        type?: AppointmentType;
        status?: AppointmentStatus;
        notes?: string | null;
        assignedUserId?: string | null;
        amountCents?: number | null;
        paymentStatus?: PaymentStatus;
      };

    const appointment = await appointmentService.update(id, tenantId, {
      petId,
      date: date ? new Date(date) : undefined,
      type,
      status,
      notes,
      assignedUserId,
      amountCents,
      paymentStatus
    });

    res.status(200).json(appointment);
  }

  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { status, paymentStatus, startDate, endDate } = req.query as unknown as {
      status?: AppointmentStatus;
      paymentStatus?: PaymentStatus;
      startDate?: string;
      endDate?: string;
    };
    const { page, pageSize, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const { rows, count } = await appointmentService.findAll(
      tenantId,
      {
        status,
        paymentStatus,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        assignedUserId: resolveAssignedUserFilter(req)
      },
      { limit, offset }
    );

    res.status(200).json(buildPaginatedResult(rows, count, page, pageSize));
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do agendamento inválido.', 400);

    const { status } = req.body as { status: AppointmentStatus };
    const appointment = await appointmentService.updateStatus(id, tenantId, status);
    res.status(200).json(appointment);
  }

  async updatePayment(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do agendamento inválido.', 400);

    const { amountCents, paymentStatus } = req.body as {
      amountCents?: number | null;
      paymentStatus?: PaymentStatus;
    };

    const appointment = await appointmentService.update(id, tenantId, {
      amountCents,
      paymentStatus
    });
    res.status(200).json(appointment);
  }

  async remove(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do agendamento inválido.', 400);

    await appointmentService.remove(id, tenantId);
    res.status(204).send();
  }
}

export default new AppointmentController();
