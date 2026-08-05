import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { decodeJwtPayload } from '../utils/jwt.util';
import { buildValidJwt } from '../testing/jwt-test.util';
import { AuthService } from '../services/auth.service';
import { ClinicBrandingService } from '../services/clinic-branding.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { authInterceptor, resetAuthInterceptorState } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let notifications: jasmine.SpyObj<NotificationService>;

  const apiBase = environment.apiUrl.replace(/\/$/, '');
  const tenantId = '42';
  let token: string;

  beforeEach(() => {
    resetAuthInterceptorState();
    token = buildValidJwt({ tenantId });
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getToken',
      'getRefreshToken',
      'logout',
      'refresh'
    ]);
    authService.getToken.and.returnValue(token);
    authService.getRefreshToken.and.returnValue(null);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    const branding = jasmine.createSpyObj<ClinicBrandingService>('ClinicBrandingService', ['reset']);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning'
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: ClinicBrandingService, useValue: branding },
        { provide: NotificationService, useValue: notifications },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('injeta Authorization: Bearer <JWT> e withCredentials nas requisições à API', () => {
    http.get(`${apiBase}/pets`).subscribe();

    const req = httpMock.expectOne(`${apiBase}/pets`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    expect(req.request.withCredentials).toBeTrue();
    req.flush([]);
  });

  it('propaga tenantId no payload do JWT enviado no Authorization', () => {
    http.get(`${apiBase}/dashboard/metrics`).subscribe();

    const req = httpMock.expectOne(`${apiBase}/dashboard/metrics`);
    const authorization = req.request.headers.get('Authorization');
    expect(authorization).toBeTruthy();

    const jwt = authorization!.replace(/^Bearer\s+/i, '');
    const payload = decodeJwtPayload(jwt);

    expect(payload).toBeTruthy();
    expect(String(payload!['tenantId'])).toBe(tenantId);
    req.flush({});
  });

  it('não injeta Authorization em URLs fora da API', () => {
    http.get('https://cdn.example.com/asset.json').subscribe();

    const req = httpMock.expectOne('https://cdn.example.com/asset.json');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('não injeta Authorization quando não há token em memória (cookies cobrem)', () => {
    authService.getToken.and.returnValue(null);

    http.get(`${apiBase}/pets`).subscribe();

    const req = httpMock.expectOne(`${apiBase}/pets`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    expect(req.request.withCredentials).toBeTrue();
    req.flush([]);
  });

  it('tenta refresh e faz logout se o refresh falhar', () => {
    authService.refresh.and.returnValue(throwError(() => ({ status: 401 })));

    http.get(`${apiBase}/pets`).subscribe({
      next: () => fail('deveria falhar com 401'),
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne(`${apiBase}/pets`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refresh).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalledWith({ reason: 'session_expired' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('tenta refresh e reenvia a request em 401 com refresh cookie válido', () => {
    const newToken = buildValidJwt({ tenantId, sub: 'refreshed' });
    let currentToken: string | null = token;
    authService.getToken.and.callFake(() => currentToken);
    authService.refresh.and.callFake(() => {
      currentToken = newToken;
      return of({
        token: newToken,
        refreshToken: 'new-refresh',
        user: {
          id: '1',
          name: 'Test',
          email: 't@t.com',
          role: 'ADMIN',
          tenantId: 42
        }
      });
    });

    http.get(`${apiBase}/pets`).subscribe({
      next: (body) => {
        expect(body).toEqual([{ id: '1' }]);
      },
      error: () => fail('não deveria falhar após refresh')
    });

    const failed = httpMock.expectOne(`${apiBase}/pets`);
    failed.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refresh).toHaveBeenCalled();

    const retry = httpMock.expectOne(`${apiBase}/pets`);
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    expect(retry.request.withCredentials).toBeTrue();
    retry.flush([{ id: '1' }]);

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('não faz logout automático em 401 do endpoint de login', () => {
    http.post(`${apiBase}/auth/login`, { email: 'a@b.com', password: '123456' }).subscribe({
      next: () => fail('deveria falhar com 401'),
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne(`${apiBase}/auth/login`);
    req.flush({ message: 'Credenciais inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(authService.refresh).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('não faz logout automático em 401 do endpoint de signup', () => {
    http
      .post(`${apiBase}/auth/signup`, {
        tenantName: 'Clinica',
        userName: 'Admin',
        email: 'a@b.com',
        password: '12345678'
      })
      .subscribe({
        next: () => fail('deveria falhar com 401'),
        error: (err) => {
          expect(err.status).toBe(401);
        }
      });

    const req = httpMock.expectOne(`${apiBase}/auth/signup`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('exibe toast Sem permissão em 403 da API', () => {
    http.delete(`${apiBase}/pets/abc`).subscribe({
      next: () => fail('deveria falhar com 403'),
      error: (err) => {
        expect(err.status).toBe(403);
      }
    });

    const req = httpMock.expectOne(`${apiBase}/pets/abc`);
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(notifications.error).toHaveBeenCalledWith('Sem permissão');
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
