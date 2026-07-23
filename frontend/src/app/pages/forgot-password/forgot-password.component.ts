import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { mapAuthHttpError } from '../../core/utils/auth-error.util';
import { AuthPageShellComponent } from '../../shared/ui/auth-page-shell.component';
import { UiBlockService } from '../../shared/ui/ui-block.service';
import {
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_PRIMARY_BTN_CLASS
} from '../../shared/ui/auth-form.styles';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthPageShellComponent],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly uiBlock = inject(UiBlockService);

  readonly inputClass = AUTH_INPUT_CLASS;
  readonly labelClass = AUTH_LABEL_CLASS;
  readonly primaryBtnClass = AUTH_PRIMARY_BTN_CLASS;

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
    this.uiBlock.show('Enviando link de recuperação…');
    const { email } = this.form.getRawValue();

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.loading = false;
        this.uiBlock.hide();
        this.successMessage =
          'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.';
        this.form.reset({ email: '' });
      },
      error: (err: unknown) => {
        this.loading = false;
        this.uiBlock.hide();
        this.errorMessage = mapAuthHttpError(err, 'forgot');
      }
    });
  }
}
