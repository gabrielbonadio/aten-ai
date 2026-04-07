import { Op } from 'sequelize';
import Appointment from '../../appointments/models/Appointment';
import Pet from '../../pets/models/Pet';
import Tutor from '../../tutors/models/Tutor';

export type DashboardMetrics = {
  totalPets: number;
  totalTutors: number;
  appointmentsToday: number;
  recentAppointments: Appointment[];
};

function toTenantIdNumber(tenantId: string): number {
  const n = Number(tenantId);
  return Number.isFinite(n) ? n : NaN;
}

class DashboardService {
  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const tenantIdNumber = toTenantIdNumber(tenantId);
    if (!Number.isFinite(tenantIdNumber)) {
      // tenantId vem do JWT; se for inválido, tratamos como erro de contexto.
      throw new Error('tenantId inválido no contexto autenticado.');
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const [totalPets, totalTutors, appointmentsToday, recentAppointments] = await Promise.all([
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

    return { totalPets, totalTutors, appointmentsToday, recentAppointments };
  }
}

export default new DashboardService();

