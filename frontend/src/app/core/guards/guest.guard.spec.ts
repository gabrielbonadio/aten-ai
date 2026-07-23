import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';

describe('guestGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let dashboardTree: UrlTree;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isTokenValid']);
    dashboardTree = { toString: () => '/dashboard' } as UrlTree;
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(dashboardTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guestGuard({} as never, {} as never)
    ) as boolean | UrlTree;
  }

  it('permite a rota quando não há sessão válida', () => {
    authService.isTokenValid.and.returnValue(false);
    expect(runGuard()).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redireciona para /dashboard quando já autenticado', () => {
    authService.isTokenValid.and.returnValue(true);
    expect(runGuard()).toBe(dashboardTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });
});
