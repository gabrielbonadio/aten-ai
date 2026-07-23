import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { lucideAppIconsProviders } from '../../core/providers/lucide-app-icons.provider';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let component: SignupComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['signUp']);

    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [lucideAppIconsProviders, provideRouter([]), { provide: AuthService, useValue: authService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('não chama signUp quando o formulário é inválido', () => {
    component.form.setValue({
      tenantName: '',
      userName: '',
      email: 'invalido',
      password: '123'
    });

    component.submit();

    expect(component.form.controls.tenantName.touched).toBeTrue();
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('rejeita senha sem caractere especial', () => {
    component.form.setValue({
      tenantName: 'Clínica Pets',
      userName: 'Maria Silva',
      email: 'maria@clinica.com',
      password: 'SenhaSegura123'
    });

    component.submit();

    expect(component.form.controls.password.invalid).toBeTrue();
    expect(authService.signUp).not.toHaveBeenCalled();
  });

  it('chama signUp e redireciona para /dashboard no sucesso', fakeAsync(() => {
    authService.signUp.and.returnValue(
      of({
        token: 'fake.jwt.token',
        refreshToken: 'fake.refresh.token',
        user: {
          id: '1',
          name: 'Maria Silva',
          email: 'maria@clinica.com',
          role: 'ADMIN',
          tenantId: 1
        }
      })
    );

    component.form.setValue({
      tenantName: 'Clínica Pets',
      userName: 'Maria Silva',
      email: 'maria@clinica.com',
      password: 'SenhaSegura@123'
    });

    component.submit();
    tick();
    flushMicrotasks();

    expect(authService.signUp).toHaveBeenCalledWith({
      tenantName: 'Clínica Pets',
      userName: 'Maria Silva',
      email: 'maria@clinica.com',
      password: 'SenhaSegura@123'
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    expect(component.loading).toBeFalse();
  }));

  it('exibe erro da API sem redirecionar', fakeAsync(() => {
    authService.signUp.and.returnValue(
      throwError(() => ({
        error: { message: 'E-mail já cadastrado.' },
        status: 409
      }))
    );

    component.form.setValue({
      tenantName: 'Clínica Pets',
      userName: 'Maria Silva',
      email: 'maria@clinica.com',
      password: 'SenhaSegura@123'
    });

    component.submit();
    tick();

    expect(component.errorMessage).toBe('E-mail já cadastrado.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));
});
