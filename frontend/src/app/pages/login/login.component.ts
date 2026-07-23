import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { consumeAuthNotice } from '../../core/utils/auth-notice.util';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  loading = false;
  errorMessage: string | null = null;
  sessionNotice: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    if (consumeAuthNotice() === 'session_expired') {
      this.sessionNotice = 'Sua sessão expirou. Entre novamente para continuar.';
      this.notifications.warning(this.sessionNotice);
    }
  }

  submit(): void {
    this.errorMessage = null;
    this.sessionNotice = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.form.getRawValue();

    this.authService
      .login({ email, password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err: any) => {
          // Para login inválido (401), queremos ficar na tela e mostrar feedback.
          const msg =
            err?.error?.message ??
            err?.message ??
            'Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.';
          this.errorMessage = String(msg);
        }
      });
  }
}
