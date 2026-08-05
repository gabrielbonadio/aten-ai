import request from 'supertest';
import usersRoutes from '../../modules/users/routes';
import userService from '../../modules/users/services/UserService';
import { bearer, signTestToken, TENANT_A_ID, userTenantA } from '../helpers/fixtures';
import { createTestApp } from '../helpers/createTestApp';

jest.mock('../../modules/users/services/UserService', () => ({
  __esModule: true,
  default: {
    invite: jest.fn(),
    listByTenant: jest.fn(),
    update: jest.fn()
  }
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

describe('POST /users/invites (RBAC)', () => {
  const app = createTestApp(usersRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ADMIN convida com sucesso', async () => {
    const adminToken = signTestToken({
      id: userTenantA.id,
      role: 'ADMIN',
      tenantId: String(TENANT_A_ID)
    });

    mockedUserService.invite.mockResolvedValue({
      id: 'invited-id',
      name: 'novo',
      email: 'novo@tenant-a.com',
      role: 'MEMBER',
      tenantId: TENANT_A_ID,
      active: false
    });

    const response = await request(app)
      .post('/users/invites')
      .set(bearer(adminToken))
      .send({ email: 'novo@tenant-a.com', role: 'MEMBER' })
      .expect(201);

    expect(response.body.email).toBe('novo@tenant-a.com');
    expect(mockedUserService.invite).toHaveBeenCalledWith(
      { email: 'novo@tenant-a.com', role: 'MEMBER' },
      TENANT_A_ID
    );
  });

  it('MEMBER não pode convidar (403)', async () => {
    const memberToken = signTestToken({
      id: 'member-user-id',
      role: 'MEMBER',
      tenantId: String(TENANT_A_ID)
    });

    await request(app)
      .post('/users/invites')
      .set(bearer(memberToken))
      .send({ email: 'outro@tenant-a.com' })
      .expect(403);

    expect(mockedUserService.invite).not.toHaveBeenCalled();
  });
});
