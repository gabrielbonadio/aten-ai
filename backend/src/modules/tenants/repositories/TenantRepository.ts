import type { Transaction } from 'sequelize';
import Tenant from '../models/Tenant';
import type { TenantPlan, TenantStatus } from '../models/Tenant';

export type CreateTenantData = {
  name: string;
  slug: string;
  plan?: TenantPlan;
  status?: TenantStatus;
};

class TenantRepository {
  async findAll(options?: { transaction?: Transaction }): Promise<Tenant[]> {
    return Tenant.findAll({
      order: [['createdAt', 'DESC']],
      transaction: options?.transaction
    });
  }

  async findBySlug(slug: string, options?: { transaction?: Transaction }): Promise<Tenant | null> {
    return Tenant.findOne({
      where: { slug },
      transaction: options?.transaction
    });
  }

  async findById(id: number, options?: { transaction?: Transaction }): Promise<Tenant | null> {
    return Tenant.findByPk(id, { transaction: options?.transaction });
  }

  async create(data: CreateTenantData, options?: { transaction?: Transaction }): Promise<Tenant> {
    return Tenant.create(
      {
        name: data.name,
        slug: data.slug,
        plan: data.plan ?? 'free',
        status: data.status ?? 'active'
      },
      { transaction: options?.transaction }
    );
  }
}

export default new TenantRepository();
