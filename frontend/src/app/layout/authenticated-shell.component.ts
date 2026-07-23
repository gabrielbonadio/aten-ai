import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/ui/sidebar/sidebar.component';
import { APP_SIDEBAR_NAV } from '../core/navigation/app-sidebar.nav';
import { ShellLayoutService } from '../core/services/shell-layout.service';

@Component({
  selector: 'app-authenticated-shell',
  standalone: true,
  imports: [NgClass, RouterOutlet, SidebarComponent],
  template: `
    <div class="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      @if (shell.mobileNavOpen()) {
        <button
          type="button"
          class="fixed inset-0 z-40 bg-zinc-950/50 md:hidden"
          aria-label="Fechar menu de navegação"
          (click)="shell.closeMobileNav()"
        ></button>
      }

      <!-- Sidebar sempre fixed; no desktop o spacer abaixo reserva a largura. -->
      <div
        class="fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out"
        [ngClass]="
          shell.mobileNavOpen() ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        "
      >
        <app-sidebar
          [collapsed]="shell.sidebarCollapsed()"
          [items]="navItems"
          [forceExpanded]="shell.mobileNavOpen()"
          (toggle)="onSidebarToggle()"
          (navigated)="shell.closeMobileNav()"
        />
      </div>

      <div
        class="hidden shrink-0 md:block"
        [ngClass]="shell.sidebarCollapsed() ? 'w-20' : 'w-64'"
        aria-hidden="true"
      ></div>

      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <div id="main-content" tabindex="-1" class="flex min-h-0 min-w-0 flex-1 flex-col outline-none">
          <router-outlet />
        </div>
      </div>
    </div>
  `
})
export class AuthenticatedShellComponent {
  readonly shell = inject(ShellLayoutService);
  readonly navItems = APP_SIDEBAR_NAV;

  onSidebarToggle(): void {
    if (this.shell.mobileNavOpen()) {
      this.shell.closeMobileNav();
      return;
    }
    this.shell.toggleSidebarCollapsed();
  }
}
