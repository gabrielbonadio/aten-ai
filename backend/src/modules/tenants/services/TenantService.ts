import tenantRepository, { CreateTenantData } from '../repositories/TenantRepository';
import Tenant from '../models/Tenant';
import { ConflictError } from '../../../shared/errors/AppError';

export type CreateTenantInput = CreateTenantData;

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
}

export default new TenantService();
