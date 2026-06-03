import { BadRequestException } from "@nestjs/common";
import type { PaginatedResponseDto, PaginationMetaDto } from "@ai-stock-advisor/shared";

export const defaultPage = 1;
export const defaultLimit = 10;
export const maxLimit = 100;

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface NormalizedPagination {
  page: number;
  limit: number;
}

export function normalizePagination(
  options: PaginationOptions = {},
): NormalizedPagination {
  const page = options.page ?? defaultPage;
  const limit = options.limit ?? defaultLimit;

  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestException("page must be greater than or equal to 1");
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException("limit must be greater than or equal to 1");
  }

  if (limit > maxLimit) {
    throw new BadRequestException(`limit must not be greater than ${maxLimit}`);
  }

  return { page, limit };
}

export function createPaginationMeta(
  totalItems: number,
  pagination: NormalizedPagination,
): PaginationMetaDto {
  const totalPages = Math.ceil(totalItems / pagination.limit);

  return {
    page: pagination.page,
    limit: pagination.limit,
    totalItems,
    totalPages,
    hasNextPage: pagination.page < totalPages,
    hasPreviousPage: pagination.page > 1 && totalPages > 0,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  pagination: NormalizedPagination,
): PaginatedResponseDto<T> {
  return {
    items,
    meta: createPaginationMeta(totalItems, pagination),
  };
}

export function paginateItems<T>(
  items: T[],
  options: PaginationOptions = {},
): PaginatedResponseDto<T> {
  const pagination = normalizePagination(options);
  const startIndex = (pagination.page - 1) * pagination.limit;

  return createPaginatedResponse(
    items.slice(startIndex, startIndex + pagination.limit),
    items.length,
    pagination,
  );
}
