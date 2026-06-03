import type { PaginationMetaDto } from "@ai-stock-advisor/shared";

export function shouldShowPagination(
  meta: PaginationMetaDto | undefined,
  pageSize: number,
): boolean {
  return meta !== undefined && meta.totalItems > pageSize;
}

export function resolveValidPage(
  currentPage: number,
  meta: PaginationMetaDto | undefined,
): number {
  if (meta && meta.totalPages > 0 && currentPage > meta.totalPages) {
    return meta.totalPages;
  }

  return currentPage;
}

export function getPageAfterRemovingCurrentItem({
  currentItemsCount,
  currentPage,
  meta,
}: {
  currentItemsCount: number;
  currentPage: number;
  meta: PaginationMetaDto | undefined;
}): number {
  if (!meta || currentItemsCount !== 1) {
    return currentPage;
  }

  const nextTotalItems = Math.max(0, meta.totalItems - 1);
  const nextTotalPages = Math.ceil(nextTotalItems / meta.limit);

  if (nextTotalPages === 0) {
    return 1;
  }

  return Math.min(currentPage, nextTotalPages);
}
