import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { lucideAppIconsProviders } from '../../core/providers/lucide-app-icons.provider';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let queryToken: string;

  const validToken = 'a'.repeat(32);

  beforeEach(async () => {
    queryToken = validToken;
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        lucideAppIconsProviders,
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ token: queryToken })
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('bloqueia submit com senha fraca ou confirmação diferente', () => {
    component.form.setValue({ password: 'fraca', confirmPassword: 'outra' });
    component.submit();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(component.form.invalid).toBeTrue();
  });

  it('redefine a senha e redireciona para /login', fakeAsync(() => {
    authService.resetPassword.and.returnValue(of(undefined));

    component.form.setValue({
      password: 'Senha@123',
      confirmPassword: 'Senha@123'
    });

    component.submit();
    tick();

    expect(authService.resetPassword).toHaveBeenCalledWith(validToken, 'Senha@123');
    expect(component.successMessage).toContain('sucesso');

    tick(1500);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  }));

  it('exibe erro da API sem redirecionar', fakeAsync(() => {
    authService.resetPassword.and.returnValue(
      throwError(() => ({ error: { message: 'Token inválido ou expirado' } }))
    );

    component.form.setValue({
      password: 'Senha@123',
      confirmPassword: 'Senha@123'
    });

    component.submit();
    tick();

    expect(component.errorMessage).toBe('Token inválido ou expirado');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));
});

describe('ResetPasswordComponent sem token', () => {
  it('marca tokenMissing quando o query param é inválido', async () => {
    await TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        lucideAppIconsProviders,
        provideRouter([]),
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.tokenMissing).toBeTrue();
    expect(fixture.componentInstance.errorMessage).toContain('Link inválido');
  });
});
