import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html'
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  errorMessage: string | null = null;

  readonly form = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    userName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  submit(): void {
    this.errorMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { tenantName, userName, email, password } = this.form.getRawValue();

    this.authService
      .signUp({ tenantName, userName, email, password })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err: unknown) => {
          const httpErr = err as { error?: { message?: string }; message?: string };
          const msg =
            httpErr?.error?.message ??
            httpErr?.message ??
            'Não foi possível criar a conta. Tente novamente.';
          this.errorMessage = String(msg);
        }
      });
  }
}
