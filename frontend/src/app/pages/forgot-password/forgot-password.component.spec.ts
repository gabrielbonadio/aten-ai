import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { lucideAppIconsProviders } from '../../core/providers/lucide-app-icons.provider';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['forgotPassword']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [lucideAppIconsProviders, provideRouter([]), { provide: AuthService, useValue: authService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('não chama a API com e-mail inválido', () => {
    component.form.setValue({ email: 'invalido' });
    component.submit();

    expect(component.form.controls.email.touched).toBeTrue();
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('exibe mensagem de sucesso após solicitar recuperação', fakeAsync(() => {
    authService.forgotPassword.and.returnValue(of(undefined));

    component.form.setValue({ email: 'admin@clinica.com' });
    component.submit();
    tick();

    expect(authService.forgotPassword).toHaveBeenCalledWith('admin@clinica.com');
    expect(component.successMessage).toContain('receberá um link');
    expect(component.loading).toBeFalse();
  }));

  it('exibe erro da API', fakeAsync(() => {
    authService.forgotPassword.and.returnValue(
      throwError(() => ({ error: { message: 'Falha no envio.' } }))
    );

    component.form.setValue({ email: 'admin@clinica.com' });
    component.submit();
    tick();

    expect(component.errorMessage).toBe('Falha no envio.');
    expect(component.successMessage).toBeNull();
  }));
});
