export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function normalizePagination({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) {
  const normalizedPage = Math.max(Number(page || DEFAULT_PAGE), 1);
  const normalizedLimit = Math.min(Math.max(Number(limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  const offset = (normalizedPage - 1) * normalizedLimit;

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset
  };
}

export function buildPaginationMeta({ page, limit, total }) {
  const safeTotal = Number(total || 0);
  const safeLimit = Number(limit || DEFAULT_LIMIT);
  const totalPages = safeLimit > 0 ? Math.ceil(safeTotal / safeLimit) : 0;

  return {
    page: Number(page || DEFAULT_PAGE),
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNextPage: Number(page || DEFAULT_PAGE) < totalPages,
    hasPreviousPage: Number(page || DEFAULT_PAGE) > 1
  };
}

export function paginationFromQuery(query = {}) {
  return normalizePagination({
    page: query.page,
    limit: query.limit
  });
}
