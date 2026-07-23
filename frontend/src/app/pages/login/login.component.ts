import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { mapAuthHttpError } from '../../core/utils/auth-error.util';
import { consumeAuthNotice } from '../../core/utils/auth-notice.util';
import { NotificationService } from '../../shared/notifications/notification.service';
import { AuthPageShellComponent } from '../../shared/ui/auth-page-shell.component';
import { UiBlockService } from '../../shared/ui/ui-block.service';
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BTN_CLASS
} from '../../shared/ui/auth-form.styles';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    AuthPageShellComponent
  ],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly uiBlock = inject(UiBlockService);

  readonly inputClass = AUTH_INPUT_CLASS;
  readonly labelClass = AUTH_LABEL_CLASS;
  readonly primaryBtnClass = AUTH_PRIMARY_BTN_CLASS;

  loading = false;
  errorMessage: string | null = null;
  sessionNotice: string | null = null;
  readonly showPassword = signal(false);

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

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.errorMessage = null;
    this.sessionNotice = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.uiBlock.show('Entrando na sua conta…');
    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.uiBlock.update('Preparando o painel…');
        void this.router.navigateByUrl('/dashboard').finally(() => {
          this.loading = false;
          this.uiBlock.hide();
        });
      },
      error: (err: unknown) => {
        this.loading = false;
        this.uiBlock.hide();
        this.errorMessage = mapAuthHttpError(err, 'login');
      }
    });
  }
}
