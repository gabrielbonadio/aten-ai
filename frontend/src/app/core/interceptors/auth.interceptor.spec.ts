import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { decodeJwtPayload } from '../utils/jwt.util';
import { buildValidJwt } from '../testing/jwt-test.util';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const apiBase = environment.apiUrl.replace(/\/$/, '');
  const tenantId = '42';
  let token: string;

  beforeEach(() => {
    token = buildValidJwt({ tenantId });
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'logout']);
    authService.getToken.and.returnValue(token);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('injeta Authorization: Bearer <JWT> nas requisições à API', () => {
    http.get(`${apiBase}/pets`).subscribe();

    const req = httpMock.expectOne(`${apiBase}/pets`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
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

  it('não injeta Authorization quando não há token', () => {
    authService.getToken.and.returnValue(null);

    http.get(`${apiBase}/pets`).subscribe();

    const req = httpMock.expectOne(`${apiBase}/pets`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('faz logout e redireciona para /login em 401 da API (exceto login)', () => {
    http.get(`${apiBase}/pets`).subscribe({
      next: () => fail('deveria falhar com 401'),
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne(`${apiBase}/pets`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
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
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
