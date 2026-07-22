import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  loading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  submit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email } = this.form.getRawValue();

    this.authService
      .forgotPassword(email)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.successMessage =
            'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.';
          this.form.reset({ email: '' });
        },
        error: (err: unknown) => {
          const httpErr = err as { error?: { message?: string }; message?: string };
          this.errorMessage = String(
            httpErr?.error?.message ??
              httpErr?.message ??
              'Não foi possível enviar o e-mail. Tente novamente.'
          );
        }
      });
  }
}
