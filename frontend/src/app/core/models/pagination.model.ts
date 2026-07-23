export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Extrai a lista de uma resposta paginada `{ data, meta }`.
 * Aceita array legado por compatibilidade.
 */
export function unwrapPaginatedList<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (
    body !== null &&
    typeof body === 'object' &&
    Array.isArray((body as PaginatedResponse<T>).data)
  ) {
    return (body as PaginatedResponse<T>).data;
  }
  return [];
}

/** pageSize máximo aceito pelo backend. */
export const LIST_PAGE_SIZE = 100;
