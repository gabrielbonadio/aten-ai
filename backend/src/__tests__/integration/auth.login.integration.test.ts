import request from 'supertest';
import bcrypt from 'bcryptjs';
import authRoutes from '../../modules/auth/routes';
import userRepository from '../../modules/auth/repositories/UserRepository';
import tenantRepository from '../../modules/tenants/repositories/TenantRepository';
import { createTestApp } from '../helpers/createTestApp';
import { tenantA, userTenantA } from '../helpers/fixtures';

jest.mock('../../modules/auth/repositories/UserRepository', () => ({
  __esModule: true,
  default: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updatePasswordHash: jest.fn()
  }
}));

jest.mock('../../modules/tenants/repositories/TenantRepository', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn()
  }
}));

const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedTenantRepository = tenantRepository as jest.Mocked<typeof tenantRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('POST /auth/login (integration)', () => {
  const app = createTestApp(authRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna 200 e JWT quando login é válido', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(userTenantA as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);
    mockedTenantRepository.findById.mockResolvedValue(tenantA as never);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: userTenantA.email, password: 'SenhaSegura123' })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe(userTenantA.email);
    expect(response.body.tenant.id).toBe(tenantA.id);
  });

  it('retorna 401 quando a senha está incorreta', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(userTenantA as never);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: userTenantA.email, password: 'senha-errada' })
      .expect(401);

    expect(response.body.message).toMatch(/credenciais inválidas/i);
  });

  it('retorna 401 quando o usuário não existe', async () => {
    mockedUserRepository.findByEmail.mockResolvedValue(null);

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'naoexiste@test.com', password: 'SenhaSegura123' })
      .expect(401);

    expect(response.body.message).toMatch(/credenciais inválidas/i);
  });

  it('retorna 400 quando o payload é inválido', async () => {
    await request(app).post('/auth/login').send({ email: 'email-invalido' }).expect(400);
    expect(mockedUserRepository.findByEmail).not.toHaveBeenCalled();
  });
});
