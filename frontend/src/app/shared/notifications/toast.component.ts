import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  template: `
    @if (notifications.state(); as t) {
      <div
        class="pointer-events-none fixed bottom-6 left-1/2 z-[100] w-[min(100%,26rem)] -translate-x-1/2 px-4"
        role="status"
        [attr.aria-live]="t.variant === 'error' ? 'assertive' : 'polite'"
      >
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-lg shadow-zinc-900/10 backdrop-blur-[2px]"
          [ngClass]="panelClassFor(t.variant)"
        >
          <span
            class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            [ngClass]="iconWrapFor(t.variant)"
          >
            @switch (t.variant) {
              @case ('success') {
                <lucide-icon name="circle-check" class="h-5 w-5"></lucide-icon>
              }
              @case ('error') {
                <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
              }
              @case ('warning') {
                <lucide-icon name="triangle-alert" class="h-5 w-5"></lucide-icon>
              }
            }
          </span>
          <p class="min-w-0 flex-1 pt-1 leading-relaxed">{{ t.message }}</p>
          <button
            type="button"
            class="shrink-0 rounded-xl px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:text-zinc-300 dark:hover:bg-white/10"
            (click)="notifications.dismiss()"
          >
            Fechar
          </button>
        </div>
      </div>
    }
  `
})
export class ToastComponent {
  readonly notifications = inject(NotificationService);

  panelClassFor(variant: 'success' | 'error' | 'warning'): string {
    switch (variant) {
      case 'success':
        return 'border-emerald-200/90 bg-emerald-50/95 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/90 dark:text-emerald-50';
      case 'error':
        return 'border-red-200/90 bg-red-50/95 text-red-950 dark:border-red-500/35 dark:bg-red-950/90 dark:text-red-50';
      case 'warning':
        return 'border-amber-200/90 bg-amber-50/95 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/85 dark:text-amber-50';
    }
  }

  iconWrapFor(variant: 'success' | 'error' | 'warning'): string {
    switch (variant) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300';
      case 'error':
        return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300';
      case 'warning':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200';
    }
  }
}
