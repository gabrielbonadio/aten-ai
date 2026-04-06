import { NotFoundError } from '../../../shared/errors/AppError';
import Customer from '../models/Customer';

export type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string | null;
};

class CustomerService {
  /**
   * Lista clientes apenas do tenant informado — isolamento obrigatório.
   */
  async findAll(tenantId: number): Promise<Customer[]> {
    return Customer.findAll({
      where: { tenantId },
      order: [['createdAt', 'DESC']]
    });
  }

  /**
   * Cria cliente sempre vinculado ao tenantId (nunca aceitar tenant do body).
   */
  async create(data: CreateCustomerInput, tenantId: number): Promise<Customer> {
    return Customer.create({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      tenantId
    });
  }

  /**
   * Remove cliente apenas se pertencer ao tenant (evita DELETE cross-tenant).
   */
  async deleteById(id: string, tenantId: number): Promise<void> {
    const removed = await Customer.destroy({
      where: { id, tenantId }
    });

    if (removed === 0) {
      throw new NotFoundError('Cliente não encontrado.');
    }
  }
}

export default new CustomerService();
