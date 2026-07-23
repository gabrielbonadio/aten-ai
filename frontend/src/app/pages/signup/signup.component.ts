import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { mapAuthHttpError } from '../../core/utils/auth-error.util';
import { AuthPageShellComponent } from '../../shared/ui/auth-page-shell.component';
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BTN_CLASS
} from '../../shared/ui/auth-form.styles';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    AuthPageShellComponent
  ],
  templateUrl: './signup.component.html'
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly inputClass = AUTH_INPUT_CLASS;
  readonly labelClass = AUTH_LABEL_CLASS;
  readonly primaryBtnClass = AUTH_PRIMARY_BTN_CLASS;

  loading = false;
  errorMessage: string | null = null;
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    userName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]]
  });

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

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
          this.errorMessage = mapAuthHttpError(err, 'signup');
        }
      });
  }
}
