import { signAccessToken, type AccessTokenPayload } from '../../shared/utils/jwt';

export const TENANT_A_ID = 1;
export const TENANT_B_ID = 2;

export const userTenantA = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Admin Tenant A',
  email: 'admin@tenant-a.com',
  password_hash: '$2a$12$mockedhashmockedhashmockedhashmocked',
  role: 'ADMIN' as const,
  tenantId: TENANT_A_ID
};

export const userTenantB = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Admin Tenant B',
  email: 'admin@tenant-b.com',
  password_hash: '$2a$12$mockedhashmockedhashmockedhashmocked',
  role: 'ADMIN' as const,
  tenantId: TENANT_B_ID
};

export const tenantA = {
  id: TENANT_A_ID,
  name: 'Clínica Tenant A',
  slug: 'clinica-tenant-a'
};

export const tenantB = {
  id: TENANT_B_ID,
  name: 'Clínica Tenant B',
  slug: 'clinica-tenant-b'
};

export const petTenantA = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tenantId: TENANT_A_ID,
  tutorId: 'tutor-a-id',
  name: 'Thor',
  species: 'Cachorro',
  breed: 'Labrador',
  birthDate: null,
  weight: 12.5
};

export const petTenantB = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  tenantId: TENANT_B_ID,
  tutorId: 'tutor-b-id',
  name: 'Mimi',
  species: 'Gato',
  breed: 'Siamês',
  birthDate: null,
  weight: 4.2
};

export const tutorTenantA = {
  id: 'tutor-a-id',
  tenantId: TENANT_A_ID,
  name: 'João Tenant A',
  phone: '11999990000',
  email: 'joao@tenant-a.com'
};

export function signTestToken(payload: Partial<AccessTokenPayload> & Pick<AccessTokenPayload, 'id'>): string {
  return signAccessToken({
    role: 'ADMIN',
    tenantId: String(TENANT_A_ID),
    ...payload
  });
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
