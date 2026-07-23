import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ShellLayoutService } from '../../../core/services/shell-layout.service';

/** Botão hamburger visível só no mobile — abre o drawer do shell. */
@Component({
  selector: 'app-shell-menu-button',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      aria-label="Abrir menu de navegação"
      (click)="shell.openMobileNav()"
    >
      <lucide-icon name="menu" class="h-4 w-4" aria-hidden="true"></lucide-icon>
    </button>
  `
})
export class ShellMenuButtonComponent {
  readonly shell = inject(ShellLayoutService);
}
