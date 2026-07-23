import { Component, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../theme/theme.service';

/** Envelope visual compartilhado das telas públicas de auth (zinc/emerald + dark). */
@Component({
  selector: 'app-auth-page-shell',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div
      class="relative flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950"
    >
      <button
        type="button"
        class="absolute right-4 top-4 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        (click)="theme.toggle()"
        [attr.aria-label]="isDark() ? 'Ativar modo claro' : 'Ativar modo escuro'"
      >
        <lucide-icon [name]="isDark() ? 'sun' : 'moon'" class="h-4 w-4" aria-hidden="true"></lucide-icon>
        <span class="hidden sm:inline">{{ isDark() ? 'Modo claro' : 'Modo escuro' }}</span>
      </button>

      <div class="w-full max-w-md">
        <div class="mb-6 flex flex-col items-center text-center">
          <div
            class="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/25"
          >
            <span class="text-sm font-semibold tracking-tight">AI</span>
          </div>
          <div class="mt-3 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Aten-AI
          </div>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Portal para clínicas veterinárias</p>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/80"
        >
          <ng-content />
        </div>
      </div>
    </div>
  `
})
export class AuthPageShellComponent {
  readonly theme = inject(ThemeService);
  readonly isDark = computed(() => this.theme.mode() === 'dark');
}
