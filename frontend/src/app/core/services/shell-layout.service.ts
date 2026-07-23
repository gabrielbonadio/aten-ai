import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'aten-ai.sidebar_collapsed';

/**
 * Estado do shell autenticado: sidebar colapsada (persistida) e drawer mobile.
 */
@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  readonly sidebarCollapsed = signal(this.readCollapsed());
  readonly mobileNavOpen = signal(false);

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update((v) => {
      const next = !v;
      this.writeCollapsed(next);
      return next;
    });
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private writeCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // storage indisponível
    }
  }
}
