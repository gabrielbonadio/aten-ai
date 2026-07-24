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

export function unwrapPaginatedResponse<T>(body: unknown): PaginatedResponse<T> {
  if (
    body !== null &&
    typeof body === 'object' &&
    Array.isArray((body as PaginatedResponse<T>).data) &&
    (body as PaginatedResponse<T>).meta
  ) {
    return body as PaginatedResponse<T>;
  }
  const data = unwrapPaginatedList<T>(body);
  return {
    data,
    meta: {
      page: 1,
      pageSize: data.length || LIST_PAGE_SIZE,
      total: data.length,
      totalPages: data.length === 0 ? 0 : 1
    }
  };
}

/** pageSize máximo aceito pelo backend (listagens “completas” / dropdowns). */
export const LIST_PAGE_SIZE = 100;

/** pageSize padrão nas telas de lista com paginação. */
export const UI_PAGE_SIZE = 20;
