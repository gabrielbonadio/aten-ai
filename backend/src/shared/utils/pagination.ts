export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Normaliza page/pageSize vindos da query (string ou number).
 */
export function parsePagination(input: PaginationInput | Record<string, unknown>): {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
} {
  const rawPage = Number((input as PaginationInput).page ?? DEFAULT_PAGE);
  const rawSize = Number((input as PaginationInput).pageSize ?? DEFAULT_PAGE_SIZE);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawSize)))
    : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize
  };
}

export function buildPaginatedResult<T>(
  rows: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    data: rows,
    meta: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
    }
  };
}
