import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { mapAuthHttpError } from '../../core/utils/auth-error.util';
import {
  STRONG_PASSWORD_HINT,
  STRONG_PASSWORD_PATTERN
} from '../../core/utils/password-policy.util';
import { AuthPageShellComponent } from '../../shared/ui/auth-page-shell.component';
import { UiBlockService } from '../../shared/ui/ui-block.service';
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BTN_CLASS
} from '../../shared/ui/auth-form.styles';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    AuthPageShellComponent
  ],
  templateUrl: './accept-invite.component.html'
})
export class AcceptInviteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly uiBlock = inject(UiBlockService);

  readonly inputClass = AUTH_INPUT_CLASS;
  readonly labelClass = AUTH_LABEL_CLASS;
  readonly primaryBtnClass = AUTH_PRIMARY_BTN_CLASS;
  readonly passwordHint = STRONG_PASSWORD_HINT;

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  tokenMissing = false;
  readonly showPassword = signal(false);
  private inviteToken = '';

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128),
          Validators.pattern(STRONG_PASSWORD_PATTERN)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatchValidator }
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (token.length < 32) {
      this.tokenMissing = true;
      this.errorMessage = 'Link de convite inválido ou incompleto. Peça um novo convite ao administrador.';
      return;
    }
    this.inviteToken = token;
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.tokenMissing || !this.inviteToken) {
      this.errorMessage = 'Link de convite inválido ou incompleto. Peça um novo convite ao administrador.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.uiBlock.show('Ativando sua conta…');
    const { name, password } = this.form.getRawValue();

    this.authService.acceptInvite({ token: this.inviteToken, name, password }).subscribe({
      next: () => {
        this.loading = false;
        this.uiBlock.hide();
        this.successMessage = 'Conta ativada. Você já pode entrar com seu e-mail e senha.';
        this.form.reset();
        setTimeout(() => {
          void this.router.navigateByUrl('/login');
        }, 1500);
      },
      error: (err: unknown) => {
        this.loading = false;
        this.uiBlock.hide();
        this.errorMessage = mapAuthHttpError(err, 'invite');
      }
    });
  }
}
