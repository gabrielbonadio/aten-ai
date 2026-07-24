import { Component, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { PaginationMeta } from '../../core/models/pagination.model';

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (meta(); as m) {
      @if (m.totalPages > 1 || m.total > 0) {
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-1 pt-4 dark:border-zinc-800"
        >
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            @if (m.total === 0) {
              Nenhum registro
            } @else {
              Página {{ m.page }} de {{ m.totalPages || 1 }}
              <span class="text-zinc-400 dark:text-zinc-500">· {{ m.total }} no total</span>
            }
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              [disabled]="disabled() || m.page <= 1"
              (click)="pageChange.emit(m.page - 1)"
            >
              <lucide-icon name="chevron-left" class="h-4 w-4" aria-hidden="true"></lucide-icon>
              Anterior
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              [disabled]="disabled() || m.page >= m.totalPages"
              (click)="pageChange.emit(m.page + 1)"
            >
              Próxima
              <lucide-icon name="chevron-right" class="h-4 w-4" aria-hidden="true"></lucide-icon>
            </button>
          </div>
        </div>
      }
    }
  `
})
export class PaginationControlsComponent {
  readonly meta = input<PaginationMeta | null>(null);
  readonly disabled = input(false);
  readonly pageChange = output<number>();
}
