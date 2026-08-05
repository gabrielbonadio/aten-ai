import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService, type CurrentUser } from './auth.service';

describe('AuthService RBAC helpers', () => {
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), AuthService]
    });
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  function putUser(partial: Partial<CurrentUser> & Pick<CurrentUser, 'role'>): void {
    const user: CurrentUser = {
      id: 'u1',
      name: 'Teste',
      email: 't@clinica.com',
      tenantId: 1,
      ...partial
    };
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  it('isAdmin() é true para role ADMIN', () => {
    putUser({ role: 'ADMIN' });
    expect(auth.getRole()).toBe('ADMIN');
    expect(auth.isAdmin()).toBeTrue();
  });

  it('isAdmin() é false para role MEMBER', () => {
    putUser({ role: 'MEMBER' });
    expect(auth.getRole()).toBe('MEMBER');
    expect(auth.isAdmin()).toBeFalse();
  });

  it('isAdmin() é false sem user_data', () => {
    expect(auth.getRole()).toBeNull();
    expect(auth.isAdmin()).toBeFalse();
  });

  it('normaliza role com espaços e minúsculas', () => {
    putUser({ role: ' admin ' });
    expect(auth.getRole()).toBe('ADMIN');
    expect(auth.isAdmin()).toBeTrue();
  });
});

describe('AuthService acceptInvite (S2)', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  const api = `${environment.apiUrl.replace(/\/$/, '')}/auth/accept-invite`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService]
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POST /auth/accept-invite com name trim', () => {
    const token = 'a'.repeat(40);
    auth.acceptInvite({ token, name: '  João  ', password: 'Senha@123' }).subscribe();

    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.body).toEqual({
      token,
      name: 'João',
      password: 'Senha@123'
    });
    req.flush(null);
  });
});
