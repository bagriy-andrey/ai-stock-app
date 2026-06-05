import type { PaginationMetaDto } from "@ai-stock-advisor/shared";

export function paginateClientItems<Item>({
  items,
  limit,
  page,
}: {
  items: readonly Item[];
  limit: number;
  page: number;
}): Item[] {
  const startIndex = (page - 1) * limit;

  return items.slice(startIndex, startIndex + limit);
}

export function createClientPaginationMeta({
  limit,
  page,
  totalItems,
}: {
  limit: number;
  page: number;
  totalItems: number;
}): PaginationMetaDto {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}
