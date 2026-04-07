import { Request, Response } from 'express';
import { AppError } from '../../../shared/errors/AppError';
import appointmentService from '../services/AppointmentService';
import type { AppointmentStatus, AppointmentType } from '../models/Appointment';

function resolveTenantId(req: Request): number {
  const raw = req.user?.tenantId;
  if (raw === undefined) throw new AppError('Não autenticado.', 401);
  const tenantId = Number(raw);
  if (!Number.isFinite(tenantId)) throw new AppError('Identificador do tenant inválido.', 400);
  return tenantId;
}

class AppointmentController {
  async store(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { petId, date, type, status, notes } = req.body as {
      petId: string;
      date: string | Date;
      type?: AppointmentType;
      status?: AppointmentStatus;
      notes?: string | null;
    };

    const appointment = await appointmentService.create(
      {
        petId,
        date: new Date(date),
        type,
        status,
        notes
      },
      tenantId
    );

    res.status(201).json(appointment);
  }

  async index(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const { status, startDate, endDate } = req.query as unknown as {
      status?: AppointmentStatus;
      startDate?: string;
      endDate?: string;
    };

    const appointments = await appointmentService.findAll(tenantId, {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.status(200).json(appointments);
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const tenantId = resolveTenantId(req);
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0];
    if (!id) throw new AppError('Identificador do agendamento inválido.', 400);

    const { status } = req.body as { status: AppointmentStatus };
    const appointment = await appointmentService.updateStatus(id, tenantId, status);
    res.status(200).json(appointment);
  }
}

export default new AppointmentController();

