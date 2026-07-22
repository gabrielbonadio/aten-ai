import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let loginUrlTree: UrlTree;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'isTokenValid',
      'hasToken',
      'logout'
    ]);

    loginUrlTree = { toString: () => '/login' } as UrlTree;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(loginUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never)
    ) as boolean | UrlTree;
  }

  it('permite a rota quando o token é válido', () => {
    authService.isTokenValid.and.returnValue(true);

    const result = runGuard();

    expect(result).toBe(true);
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redireciona para /login quando não há token', () => {
    authService.isTokenValid.and.returnValue(false);
    authService.hasToken.and.returnValue(false);

    const result = runGuard();

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(loginUrlTree);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('faz logout e redireciona para /login quando o token está expirado', () => {
    authService.isTokenValid.and.returnValue(false);
    authService.hasToken.and.returnValue(true);

    const result = runGuard();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(loginUrlTree);
  });
});
