import tenantRepository, { CreateTenantData } from '../repositories/TenantRepository';
import Tenant from '../models/Tenant';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';

export type CreateTenantInput = CreateTenantData;

export type UpdateTenantSettingsInput = {
  name?: string;
  document?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
};

class TenantService {
  async listTenants(): Promise<Tenant[]> {
    return tenantRepository.findAll();
  }

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    const existing = await tenantRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Este slug já está sendo utilizado por outra empresa.');
    }

    return tenantRepository.create(input);
  }

  /**
   * Dados da clínica (tenant) — sempre escopado pelo tenantId do JWT no controller.
   */
  async getSettingsByTenantId(tenantId: number): Promise<Tenant> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Clínica não encontrada.');
    return tenant;
  }

  /**
   * Atualiza apenas dados cadastrais da clínica (não altera slug/plan/status por esta rota).
   */
  async updateSettingsByTenantId(tenantId: number, input: UpdateTenantSettingsInput): Promise<Tenant> {
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) throw new NotFoundError('Clínica não encontrada.');

    const patch: Parameters<typeof tenantRepository.updateById>[1] = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.document !== undefined) {
      const d = input.document?.trim();
      patch.document = d ? d : null;
    }
    if (input.phone !== undefined) {
      const p = input.phone?.trim();
      patch.phone = p ? p : null;
    }
    if (input.address !== undefined) {
      const a = input.address?.trim();
      patch.address = a ? a : null;
    }
    if (input.email !== undefined) {
      const e = input.email?.trim();
      patch.email = e ? e.toLowerCase() : null;
    }

    const updated = await tenantRepository.updateById(tenantId, patch);
    if (!updated) throw new NotFoundError('Clínica não encontrada.');
    return updated;
  }
}

export default new TenantService();
