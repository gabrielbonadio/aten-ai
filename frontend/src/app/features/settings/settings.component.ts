import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ShellMenuButtonComponent } from '../../components/ui/shell-menu-button/shell-menu-button.component';
import { ClinicBrandingService } from '../../core/services/clinic-branding.service';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import type { TenantSettings, UpdateTenantSettingsPayload } from '../../core/models/tenant-settings.model';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ThemeToggleComponent } from '../../shared/theme/theme-toggle.component';
import { digitsOnly, formatCpfCnpj, formatPhoneBR } from '../../shared/utils/br-masks';

function phoneBrValidator(control: AbstractControl): ValidationErrors | null {
  const n = digitsOnly(String(control.value ?? ''));
  if (n.length === 0) return { required: true };
  if (n.length < 10 || n.length > 11) return { phoneBr: true };
  return null;
}

function optionalEmailValidator(control: AbstractControl): ValidationErrors | null {
  const v = String(control.value ?? '').trim();
  if (!v) return null;
  return Validators.email(control);
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    LucideAngularModule,
    ShellMenuButtonComponent,
    ThemeToggleComponent
  ],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly brand = inject(ClinicBrandingService);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    document: [''],
    email: ['', [optionalEmailValidator]],
    phone: ['', [phoneBrValidator]],
    address: ['', [Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    this.settingsService.get().subscribe({
      next: (t) => {
        this.patchFormFromTenant(t);
        this.brand.applyTenant(t);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg =
          err instanceof HttpErrorResponse ? this.extractApiMessage(err) : 'Não foi possível carregar as configurações.';
        this.notifications.error(msg);
      }
    });
  }

  private patchFormFromTenant(t: TenantSettings): void {
    this.form.patchValue({
      name: t.name ?? '',
      document: t.document ? formatCpfCnpj(t.document) : '',
      email: t.email ?? '',
      phone: t.phone ? formatPhoneBR(t.phone) : '',
      address: t.address ?? ''
    });
  }

  onPhoneInput(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const formatted = formatPhoneBR(el.value);
    this.form.get('phone')?.setValue(formatted, { emitEvent: false });
    el.value = formatted;
  }

  onDocumentInput(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    const formatted = formatCpfCnpj(el.value);
    this.form.get('document')?.setValue(formatted, { emitEvent: false });
    el.value = formatted;
  }

  submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notifications.warning('Verifique os campos obrigatórios e o formato do e-mail.');
      return;
    }

    const v = this.form.getRawValue();
    const docDigits = digitsOnly(v.document);
    const payload: UpdateTenantSettingsPayload = {
      name: v.name.trim(),
      document: docDigits ? docDigits : null,
      email: v.email?.trim() ? v.email.trim().toLowerCase() : null,
      phone: digitsOnly(v.phone) || null,
      address: v.address?.trim() ? v.address.trim() : null
    };

    this.saving.set(true);
    this.settingsService.update(payload).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.patchFormFromTenant(t);
        this.brand.applyTenant(t);
        this.notifications.success('Configurações salvas com sucesso.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const msg =
          err instanceof HttpErrorResponse ? this.extractApiMessage(err) : 'Não foi possível salvar.';
        this.notifications.error(msg);
      }
    });
  }

  private extractApiMessage(err: HttpErrorResponse): string {
    const body = err.error;
    if (body && typeof body === 'object' && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    if (typeof body === 'string' && body.trim() && !/<(html|!doctype)/i.test(body)) return body;
    return 'Erro ao conectar com o servidor.';
  }

  logout(): void {
    this.brand.reset();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  showFieldError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}
