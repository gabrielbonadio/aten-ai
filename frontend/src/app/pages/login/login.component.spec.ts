import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('cria o formulário com email e senha inválidos por padrão', () => {
    expect(component.form.valid).toBeFalse();
    expect(component.form.controls.email.errors).toEqual(jasmine.objectContaining({ required: true }));
    expect(component.form.controls.password.errors).toEqual(jasmine.objectContaining({ required: true }));
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
    expect(compiled.textContent).toContain('Credenciais inválidas.');
  }));
});
