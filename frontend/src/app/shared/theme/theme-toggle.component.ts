import { Component, computed, inject, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      (click)="theme.toggle()"
      [attr.aria-label]="isDark() ? 'Ativar modo claro' : 'Ativar modo escuro'"
      [attr.aria-pressed]="isDark()"
    >
      <lucide-icon [name]="isDark() ? 'sun' : 'moon'" class="h-4 w-4" aria-hidden="true"></lucide-icon>
      @if (showLabel()) {
        <span class="hidden sm:inline">{{ isDark() ? 'Modo claro' : 'Modo escuro' }}</span>
      }
    </button>
  `
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
  readonly isDark = computed(() => this.theme.mode() === 'dark');
  /** Exibe texto ao lado do ícone a partir de `sm`. */
  readonly showLabel = input(true);
}
