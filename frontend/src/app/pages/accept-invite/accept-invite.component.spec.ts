import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { lucideAppIconsProviders } from '../../core/providers/lucide-app-icons.provider';
import { UiBlockService } from '../../shared/ui/ui-block.service';
import { AcceptInviteComponent } from './accept-invite.component';

describe('AcceptInviteComponent (S2)', () => {
  let fixture: ComponentFixture<AcceptInviteComponent>;
  let component: AcceptInviteComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let uiBlock: jasmine.SpyObj<UiBlockService>;

  const validToken = 't'.repeat(40);

  async function setup(token: string | null): Promise<void> {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['acceptInvite']);
    uiBlock = jasmine.createSpyObj<UiBlockService>('UiBlockService', ['show', 'hide']);

    await TestBed.configureTestingModule({
      imports: [AcceptInviteComponent],
      providers: [
        lucideAppIconsProviders,
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: UiBlockService, useValue: uiBlock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(token ? { token } : {})
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AcceptInviteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('marca tokenMissing sem query token', async () => {
    await setup(null);
    expect(component.tokenMissing).toBeTrue();
    expect(component.errorMessage).toContain('inválido');
  });

  it('não chama API com formulário inválido', async () => {
    await setup(validToken);
    expect(component.tokenMissing).toBeFalse();

    component.form.setValue({
      name: 'A',
      password: 'fraca',
      confirmPassword: 'fraca'
    });
    component.submit();

    expect(authService.acceptInvite).not.toHaveBeenCalled();
    expect(component.form.controls.name.touched).toBeTrue();
  });

  it('aceita convite e redireciona ao login', fakeAsync(async () => {
    await setup(validToken);
    authService.acceptInvite.and.returnValue(of(undefined));
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    component.form.setValue({
      name: 'Maria Silva',
      password: 'Senha@123',
      confirmPassword: 'Senha@123'
    });
    component.submit();
    tick();

    expect(authService.acceptInvite).toHaveBeenCalledWith({
      token: validToken,
      name: 'Maria Silva',
      password: 'Senha@123'
    });
    expect(uiBlock.show).toHaveBeenCalled();
    expect(uiBlock.hide).toHaveBeenCalled();
    expect(component.successMessage).toContain('Conta ativada');

    tick(1500);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  }));

  it('exibe erro da API', fakeAsync(async () => {
    await setup(validToken);
    authService.acceptInvite.and.returnValue(
      throwError(() => ({ error: { message: 'Convite expirado.' } }))
    );

    component.form.setValue({
      name: 'Maria Silva',
      password: 'Senha@123',
      confirmPassword: 'Senha@123'
    });
    component.submit();
    tick();

    expect(component.errorMessage).toBeTruthy();
    expect(component.loading).toBeFalse();
    expect(uiBlock.hide).toHaveBeenCalled();
  }));
});
