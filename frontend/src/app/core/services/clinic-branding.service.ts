import { Injectable, inject, signal } from '@angular/core';
import type { TenantSettings } from '../models/tenant-settings.model';
import { SettingsService } from './settings.service';
import { AuthService } from './auth.service';

/**
 * Estado global do nome da clínica e badge de plano para Header/Sidebar.
 * Atualize após salvar em Configurações ou chame `refresh()` no boot (com token).
 */
@Injectable({ providedIn: 'root' })
export class ClinicBrandingService {
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);

  /** Nome exibido no breadcrumb / contexto da clínica */
  readonly clinicName = signal('Clínica Vet');
  /** Texto do chip de plano (ex.: Plano Free) */
  readonly planLabel = signal('Plano Free');

  /** Aplica dados já obtidos (ex.: resposta do PUT) sem novo GET. */
  applyTenant(t: TenantSettings): void {
    const name = t.name?.trim();
    this.clinicName.set(name && name.length > 0 ? name : 'Clínica');
    this.planLabel.set(t.plan === 'pro' ? 'Plano Pro' : 'Plano Free');
  }

  /** Carrega GET /settings e atualiza sinais (ignora erro silenciosamente). */
  refresh(): void {
    if (!this.auth.getToken()) return;
    this.settingsService.get().subscribe({
      next: (t) => this.applyTenant(t),
      error: () => {
        /* mantém defaults */
      }
    });
  }
}
