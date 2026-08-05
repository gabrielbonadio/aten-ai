import { Op } from 'sequelize';
import Appointment from '../../appointments/models/Appointment';
import Pet from '../../pets/models/Pet';
import Tutor from '../../tutors/models/Tutor';

export type DashboardMetrics = {
  totalPets: number;
  totalTutors: number;
  appointmentsToday: number;
  /** Soma de `amountCents` com `paymentStatus=PAID` e `date` no dia local. */
  paidAmountCentsToday: number;
  recentAppointments: Appointment[];
};

export type DashboardMetricsResponse = {
  metrics: {
    totalPets: number;
    totalTutors: number;
    appointmentsTodayCount: number;
    paidAmountCentsToday: number;
  };
  todayAppointments: Appointment[];
};

function toTenantIdNumber(tenantId: string): number {
  const n = Number(tenantId);
  return Number.isFinite(n) ? n : NaN;
}

function localDayWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

class DashboardService {
  /**
   * Soma `amountCents` dos agendamentos PAID do dia (escopo tenant).
   * `Appointment.sum` devolve `null` quando não há linhas — normalizamos para 0.
   */
  private async sumPaidAmountCentsToday(tenantId: number, start: Date, end: Date): Promise<number> {
    const sum = await Appointment.sum('amountCents', {
      where: {
        [Op.and]: [
          { tenantId },
          { paymentStatus: 'PAID' },
          { date: { [Op.between]: [start, end] } }
        ]
      }
    });
    return typeof sum === 'number' && Number.isFinite(sum) ? sum : 0;
  }

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const tenantIdNumber = toTenantIdNumber(tenantId);
    if (!Number.isFinite(tenantIdNumber)) {
      // tenantId vem do JWT; se for inválido, tratamos como erro de contexto.
      throw new Error('tenantId inválido no contexto autenticado.');
    }

    const { start, end } = localDayWindow();

    const [totalPets, totalTutors, appointmentsToday, paidAmountCentsToday, recentAppointments] =
      await Promise.all([
        Pet.count({ where: { tenantId: tenantIdNumber } }),
        Tutor.count({ where: { tenantId: tenantIdNumber } }),
        Appointment.count({
          where: {
            [Op.and]: [
              { tenantId: tenantIdNumber },
              { status: { [Op.ne]: 'CANCELED' } },
              { date: { [Op.between]: [start, end] } }
            ]
          }
        }),
        this.sumPaidAmountCentsToday(tenantIdNumber, start, end),
        Appointment.findAll({
          where: { tenantId: tenantIdNumber },
          order: [['date', 'DESC']],
          limit: 5,
          include: [
            {
              model: Pet,
              as: 'pet',
              required: true,
              where: { tenantId: tenantIdNumber },
              include: [
                {
                  model: Tutor,
                  as: 'tutor',
                  required: true,
                  where: { tenantId: tenantIdNumber }
                }
              ]
            }
          ]
        })
      ]);

    return {
      totalPets,
      totalTutors,
      appointmentsToday,
      paidAmountCentsToday,
      recentAppointments
    };
  }

  async getMetricsV2(tenantId: string): Promise<DashboardMetricsResponse> {
    const tenantIdNumber = toTenantIdNumber(tenantId);
    if (!Number.isFinite(tenantIdNumber)) {
      throw new Error('tenantId inválido no contexto autenticado.');
    }

    const { start, end } = localDayWindow();

    const [totalPets, totalTutors, appointmentsTodayCount, paidAmountCentsToday, todayAppointments] =
      await Promise.all([
        Pet.count({ where: { tenantId: tenantIdNumber } }),
        Tutor.count({ where: { tenantId: tenantIdNumber } }),
        Appointment.count({
          where: {
            [Op.and]: [{ tenantId: tenantIdNumber }, { date: { [Op.between]: [start, end] } }]
          }
        }),
        this.sumPaidAmountCentsToday(tenantIdNumber, start, end),
        Appointment.findAll({
          where: {
            [Op.and]: [{ tenantId: tenantIdNumber }, { date: { [Op.between]: [start, end] } }]
          },
          order: [['date', 'ASC']],
          limit: 5,
          include: [
            {
              model: Pet,
              as: 'pet',
              required: true,
              where: { tenantId: tenantIdNumber },
              include: [
                {
                  model: Tutor,
                  as: 'tutor',
                  required: true,
                  where: { tenantId: tenantIdNumber }
                }
              ]
            }
          ]
        })
      ]);

    return {
      metrics: { totalPets, totalTutors, appointmentsTodayCount, paidAmountCentsToday },
      todayAppointments
    };
  }
}

export default new DashboardService();
