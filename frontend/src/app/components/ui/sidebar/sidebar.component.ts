import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

export type SidebarNavItem = {
  label: string;
  route: string;
  /** Nome do ícone Lucide (kebab-case) usado em <lucide-icon [name]="..."> */
  iconName: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <aside
      class="h-screen shrink-0 border-r border-zinc-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/60"
      [ngClass]="collapsed() ? 'w-20' : 'w-64'"
    >
      <div class="flex h-full flex-col">
        <div
          class="py-4"
          [ngClass]="
            collapsed()
              ? 'flex flex-col items-center gap-3 px-2'
              : 'flex items-center justify-between gap-3 px-4'
          "
        >
          <div
            [ngClass]="collapsed() ? 'flex flex-col items-center' : 'flex min-w-0 flex-1 items-center gap-3'"
          >
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
            >
              <span class="text-sm font-semibold">AI</span>
            </div>
            @if (!collapsed()) {
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Aten-AI</div>
                <div class="truncate text-xs text-zinc-500 dark:text-zinc-400">Clínica Vet v1.0</div>
              </div>
            }
          </div>

          <button
            type="button"
            class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            (click)="toggle.emit()"
            [attr.aria-label]="collapsed() ? 'Expandir sidebar' : 'Recolher sidebar'"
          >
            @if (collapsed()) {
              <lucide-icon [name]="'chevron-right'" class="h-4 w-4"></lucide-icon>
            } @else {
              <lucide-icon [name]="'chevron-left'" class="h-4 w-4"></lucide-icon>
            }
          </button>
        </div>

        <nav class="flex-1 px-2 py-2">
          <div class="space-y-1">
            @for (item of items(); track item.route) {
              <a
                class="group flex rounded-xl py-2.5 text-sm font-medium text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                [ngClass]="collapsed() ? 'justify-center px-0' : 'items-center gap-3 px-3'"
                [routerLink]="item.route"
                routerLinkActive="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <lucide-icon [name]="item.iconName" class="h-4 w-4 shrink-0 opacity-80"></lucide-icon>
                @if (!collapsed()) {
                  <span class="truncate">{{ item.label }}</span>
                }
              </a>
            }
          </div>
        </nav>

        <div class="px-2 pb-4">
          @if (!collapsed()) {
            <div
              class="rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <div class="font-semibold text-zinc-900 dark:text-zinc-50">Dica rápida</div>
              <div class="mt-1 leading-relaxed">
                Use o painel para acompanhar atendimentos, pets e agendamentos do dia.
              </div>
            </div>
          }
        </div>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly collapsed = input.required<boolean>();
  readonly items = input.required<SidebarNavItem[]>();
  readonly toggle = output<void>();
}
