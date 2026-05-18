export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function normalizePagination({ page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const normalizedPage = Math.max(Number(page || DEFAULT_PAGE), 1);
  const normalizedPageSize = Math.min(Math.max(Number(pageSize || DEFAULT_PAGE_SIZE), 1), MAX_PAGE_SIZE);
  const offset = (normalizedPage - 1) * normalizedPageSize;

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    offset
  };
}

export function buildPaginationMeta({ page, pageSize, totalItems }) {
  const safeTotal = Number(totalItems || 0);
  const safePageSize = Number(pageSize || DEFAULT_PAGE_SIZE);
  const totalPages = safePageSize > 0 ? Math.ceil(safeTotal / safePageSize) : 0;

  return {
    page: Number(page || DEFAULT_PAGE),
    pageSize: safePageSize,
    totalItems: safeTotal,
    totalPages,
    hasNextPage: Number(page || DEFAULT_PAGE) < totalPages,
    hasPreviousPage: Number(page || DEFAULT_PAGE) > 1
  };
}

export function paginationFromQuery(query = {}) {
  return normalizePagination({
    page: query.page,
    pageSize: query.pageSize
  });
}
