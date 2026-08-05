import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { setAuthNotice } from '../../core/utils/auth-notice.util';
import { NotificationService } from '../../shared/notifications/notification.service';
import { lucideAppIconsProviders } from '../../core/providers/lucide-app-icons.provider';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'loginTotp', 'isAdmin']);
    authService.isAdmin.and.returnValue(true);
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', [
      'success',
      'error',
      'warning'
    ]);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        lucideAppIconsProviders,
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('cria o formulário com email e senha inválidos por padrão', () => {
    expect(component.form.valid).toBeFalse();
    expect(component.form.controls.email.errors).toEqual(jasmine.objectContaining({ required: true }));
    expect(component.form.controls.password.errors).toEqual(jasmine.objectContaining({ required: true }));
  });

  it('exibe aviso quando a sessão expirou', () => {
    setAuthNotice('session_expired');
    const localFixture = TestBed.createComponent(LoginComponent);
    localFixture.detectChanges();

    expect(localFixture.componentInstance.sessionNotice).toContain('sessão expirou');
    expect(notifications.warning).toHaveBeenCalled();
    expect((localFixture.nativeElement as HTMLElement).textContent).toContain('sessão expirou');
  });

  it('marca os campos como touched e não chama login quando o formulário é inválido', () => {
    component.form.setValue({ email: 'email-invalido', password: '123' });

    component.submit();

    expect(component.form.controls.email.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
    expect(component.form.controls.email.invalid).toBeTrue();
    expect(component.form.controls.password.invalid).toBeTrue();
    expect(authService.login).not.toHaveBeenCalled();

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Informe um e-mail válido.');
    expect(compiled.textContent).toContain('Informe sua senha (mín. 6 caracteres).');
  });

  it('chama authService.login e redireciona para /dashboard no sucesso', fakeAsync(() => {
    authService.login.and.returnValue(
      of({
        token: 'fake.jwt.token',
        refreshToken: 'fake.refresh.token',
        user: {
          id: '1',
          name: 'Admin',
          email: 'admin@clinica.com',
          role: 'ADMIN',
          tenantId: 1
        }
      })
    );

    component.form.setValue({
      email: 'admin@clinica.com',
      password: 'SenhaSegura123'
    });

    component.submit();
    tick();
    flushMicrotasks();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@clinica.com',
      password: 'SenhaSegura123'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toBeNull();
  }));

  it('exibe mensagem de erro quando o login falha', fakeAsync(() => {
    authService.login.and.returnValue(
      throwError(() => ({
        error: { message: 'Credenciais inválidas.' },
        status: 401
      }))
    );

    component.form.setValue({
      email: 'admin@clinica.com',
      password: 'senha-errada'
    });

    component.submit();
    tick();

    expect(component.errorMessage).toBe('Credenciais inválidas.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Credenciais inválidas');
  }));
});
