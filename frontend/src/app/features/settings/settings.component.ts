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
import { UiBlockService } from '../../shared/ui/ui-block.service';
import { digitsOnly, formatCpfCnpj, formatPhoneBR } from '../../shared/utils/br-masks';
import { TeamSectionComponent } from './team-section.component';

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
    ThemeToggleComponent,
    TeamSectionComponent
  ],
  templateUrl: './settings.component.html'
})
export class SettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  private readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly uiBlock = inject(UiBlockService);
  readonly brand = inject(ClinicBrandingService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isAdmin = signal(false);
  readonly totpEnabled = signal(false);
  readonly totpBusy = signal(false);
  readonly totpSetupQr = signal<string | null>(null);
  readonly totpSetupSecret = signal<string | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly recoveryRemaining = signal(0);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    document: [''],
    email: ['', [optionalEmailValidator]],
    phone: ['', [phoneBrValidator]],
    address: ['', [Validators.maxLength(500)]]
  });

  readonly totpConfirmForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  readonly totpDisableForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    this.isAdmin.set(this.auth.isAdmin());

    this.settingsService.get().subscribe({
      next: (t) => {
        this.patchFormFromTenant(t);
        this.brand.applyTenant(t);
        this.loading.set(false);
        if (this.isAdmin()) {
          this.loadTotpStatus();
        } else {
          this.form.disable({ emitEvent: false });
        }
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const msg =
          err instanceof HttpErrorResponse
            ? this.extractApiMessage(err)
            : 'Não foi possível carregar as configurações.';
        this.notifications.error(msg);
      }
    });
  }

  private loadTotpStatus(): void {
    this.auth.getTotpStatus().subscribe({
      next: (s) => {
        this.totpEnabled.set(s.enabled);
        this.recoveryRemaining.set(s.recoveryCodesRemaining);
      },
      error: () => {
        // Silencioso — MEMBER ou endpoint indisponível
      }
    });
  }

  startTotpSetup(): void {
    if (this.totpBusy()) return;
    this.totpBusy.set(true);
    this.uiBlock.show('Gerando QR Code…');
    this.auth.setupTotp().subscribe({
      next: (res) => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.totpSetupQr.set(res.qrDataUrl);
        this.totpSetupSecret.set(res.secret);
        this.recoveryCodes.set(null);
        this.totpConfirmForm.reset({ code: '' });
      },
      error: (err: unknown) => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.notifications.error(
          err instanceof HttpErrorResponse
            ? this.extractApiMessage(err)
            : 'Não foi possível iniciar o 2FA.'
        );
      }
    });
  }

  confirmTotpSetup(): void {
    if (this.totpConfirmForm.invalid) {
      this.totpConfirmForm.markAllAsTouched();
      return;
    }
    this.totpBusy.set(true);
    this.uiBlock.show('Ativando 2FA…');
    this.auth.confirmTotp(this.totpConfirmForm.controls.code.value.trim()).subscribe({
      next: (res) => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.totpEnabled.set(true);
        this.totpSetupQr.set(null);
        this.totpSetupSecret.set(null);
        this.recoveryCodes.set(res.recoveryCodes);
        this.recoveryRemaining.set(res.recoveryCodes.length);
        this.notifications.success('Autenticação em dois fatores ativada.');
      },
      error: (err: unknown) => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.notifications.error(
          err instanceof HttpErrorResponse ? this.extractApiMessage(err) : 'Código inválido.'
        );
      }
    });
  }

  cancelTotpSetup(): void {
    this.totpSetupQr.set(null);
    this.totpSetupSecret.set(null);
    this.totpConfirmForm.reset({ code: '' });
  }

  disableTotp(): void {
    if (this.totpDisableForm.invalid) {
      this.totpDisableForm.markAllAsTouched();
      return;
    }
    this.totpBusy.set(true);
    this.uiBlock.show('Desativando 2FA…');
    const { password, code } = this.totpDisableForm.getRawValue();
    this.auth.disableTotp({ password, code }).subscribe({
      next: () => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.totpEnabled.set(false);
        this.recoveryCodes.set(null);
        this.recoveryRemaining.set(0);
        this.totpDisableForm.reset({ password: '', code: '' });
        this.notifications.success('2FA desativado.');
      },
      error: (err: unknown) => {
        this.totpBusy.set(false);
        this.uiBlock.hide();
        this.notifications.error(
          err instanceof HttpErrorResponse
            ? this.extractApiMessage(err)
            : 'Não foi possível desativar o 2FA.'
        );
      }
    });
  }

  dismissRecoveryCodes(): void {
    this.recoveryCodes.set(null);
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
    if (!this.isAdmin()) {
      this.notifications.error('Sem permissão');
      return;
    }
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
    this.uiBlock.show('Salvando configurações…');
    this.settingsService.update(payload).subscribe({
      next: (t) => {
        this.saving.set(false);
        this.uiBlock.hide();
        this.patchFormFromTenant(t);
        this.brand.applyTenant(t);
        this.notifications.success('Configurações salvas com sucesso.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.uiBlock.hide();
        if (err instanceof HttpErrorResponse && err.status === 403) return;
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
    this.uiBlock.show('Saindo da conta…');
    this.brand.reset();
    this.auth.logout();
    void this.router.navigateByUrl('/login').finally(() => this.uiBlock.hide());
  }

  showFieldError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.touched || c.dirty);
  }
}
