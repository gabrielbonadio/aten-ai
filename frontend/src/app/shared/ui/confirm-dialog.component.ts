import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  input,
  output,
  viewChild
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Diálogo de confirmação (exclusões etc.).
 * Escape e clique no backdrop cancelam; foco inicial no botão cancelar.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (open()) {
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 px-4 py-6 backdrop-blur-sm sm:items-center"
        role="presentation"
        (click)="onBackdropClick()"
      >
        <div
          class="w-full max-w-md overscroll-contain rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start gap-3">
            <div
              class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"
            >
              <lucide-icon name="alert-circle" class="h-5 w-5" aria-hidden="true"></lucide-icon>
            </div>
            <div class="min-w-0 flex-1">
              <h2 [id]="titleId" class="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {{ title() }}
              </h2>
              <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <ng-content />
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              #cancelBtn
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              [disabled]="confirming()"
              (click)="cancelled.emit()"
            >
              {{ cancelLabel() }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="confirming()"
              (click)="confirmed.emit()"
            >
              {{ confirming() ? confirmingLabel() : confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialogComponent implements OnDestroy {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly confirmLabel = input('Sim, excluir');
  readonly confirmingLabel = input('Excluindo…');
  readonly cancelLabel = input('Cancelar');
  readonly confirming = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly titleId = `confirm-dialog-title-${Math.random().toString(36).slice(2, 9)}`;

  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');

  constructor() {
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.cancelBtn()?.nativeElement.focus());
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open() && !this.confirming()) {
      this.cancelled.emit();
    }
  }

  onBackdropClick(): void {
    if (!this.confirming()) {
      this.cancelled.emit();
    }
  }
}
