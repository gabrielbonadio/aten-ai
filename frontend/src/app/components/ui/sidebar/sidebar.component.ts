import { NgClass } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ClinicBrandingService } from '../../../core/services/clinic-branding.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiBlockService } from '../../../shared/ui/ui-block.service';

export type SidebarNavItem = {
  label: string;
  route: string;
  /** Nome do ícone Lucide (kebab-case) usado em <lucide-icon [name]="..."> */
  iconName: string;
  /**
   * Se false, marca o item ativo também em rotas filhas (ex.: /pets/:id).
   * Default: true.
   */
  exact?: boolean;
  /** Se true, item só aparece para ADMIN. */
  adminOnly?: boolean;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside
      class="flex h-screen shrink-0 flex-col border-r border-zinc-200/70 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/95"
      [ngClass]="isVisuallyCollapsed() ? 'w-20' : 'w-64'"
    >
      <div class="flex h-full min-h-0 flex-col">
        <div
          class="py-4"
          [ngClass]="
            isVisuallyCollapsed()
              ? 'flex flex-col items-center gap-3 px-2'
              : 'flex items-center justify-between gap-3 px-4'
          "
        >
          <div
            [ngClass]="
              isVisuallyCollapsed()
                ? 'flex flex-col items-center'
                : 'flex min-w-0 flex-1 items-center gap-3'
            "
          >
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
            >
              <span class="text-sm font-semibold">AI</span>
            </div>
            @if (!isVisuallyCollapsed()) {
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Aten-AI</div>
                <div class="truncate text-xs text-zinc-500 dark:text-zinc-400">{{ brand.clinicName() }}</div>
                <div class="truncate text-[11px] text-zinc-400 dark:text-zinc-500">{{ brand.planLabel() }}</div>
              </div>
            }
          </div>

          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            (click)="toggle.emit()"
            [attr.aria-label]="
              forceExpanded()
                ? 'Fechar menu'
                : isVisuallyCollapsed()
                  ? 'Expandir sidebar'
                  : 'Recolher sidebar'
            "
          >
            @if (forceExpanded()) {
              <lucide-icon name="x" class="h-4 w-4" aria-hidden="true"></lucide-icon>
            } @else if (isVisuallyCollapsed()) {
              <lucide-icon name="chevron-right" class="h-4 w-4" aria-hidden="true"></lucide-icon>
            } @else {
              <lucide-icon name="chevron-left" class="h-4 w-4" aria-hidden="true"></lucide-icon>
            }
          </button>
        </div>

        <nav class="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Navegação principal">
          <div class="space-y-1">
            @for (item of items(); track item.route) {
              <a
                class="group flex rounded-xl py-2.5 text-sm font-medium text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                [ngClass]="isVisuallyCollapsed() ? 'justify-center px-0' : 'items-center gap-3 px-3'"
                [routerLink]="item.route"
                routerLinkActive="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                [routerLinkActiveOptions]="{ exact: item.exact !== false }"
                [attr.aria-label]="item.label"
                [attr.title]="isVisuallyCollapsed() ? item.label : null"
                (click)="navigated.emit()"
              >
                <lucide-icon
                  [name]="item.iconName"
                  class="h-4 w-4 shrink-0 opacity-80"
                  aria-hidden="true"
                ></lucide-icon>
                @if (!isVisuallyCollapsed()) {
                  <span class="truncate">{{ item.label }}</span>
                }
              </a>
            }
          </div>
        </nav>

        <div class="space-y-2 px-2 pb-4">
          @if (!isVisuallyCollapsed()) {
            <div
              class="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <div class="font-semibold text-zinc-900 dark:text-zinc-50">Dica rápida</div>
              <div class="mt-1 leading-relaxed">
                Use o painel para acompanhar atendimentos, pets e agendamentos do dia.
              </div>
            </div>
          }

          <button
            type="button"
            class="flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-zinc-700 hover:bg-red-50 hover:text-red-700 dark:text-zinc-200 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            [ngClass]="isVisuallyCollapsed() ? 'justify-center px-0' : 'gap-3 px-3'"
            (click)="onLogout()"
            [attr.aria-label]="'Sair'"
            [attr.title]="isVisuallyCollapsed() ? 'Sair' : null"
          >
            <lucide-icon name="log-out" class="h-4 w-4 shrink-0 opacity-80" aria-hidden="true"></lucide-icon>
            @if (!isVisuallyCollapsed()) {
              <span>Sair</span>
            }
          </button>
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly uiBlock = inject(UiBlockService);
  readonly brand = inject(ClinicBrandingService);

  readonly collapsed = input.required<boolean>();
  readonly items = input.required<SidebarNavItem[]>();
  /** No drawer mobile, força largura expandida (ignora collapsed). */
  readonly forceExpanded = input(false);

  readonly toggle = output<void>();
  readonly navigated = output<void>();

  isVisuallyCollapsed(): boolean {
    return this.collapsed() && !this.forceExpanded();
  }

  onLogout(): void {
    this.uiBlock.show('Saindo da conta…');
    this.brand.reset();
    this.auth.logout();
    this.navigated.emit();
    void this.router.navigateByUrl('/login').finally(() => this.uiBlock.hide());
  }
}
