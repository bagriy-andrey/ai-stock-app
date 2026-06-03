import type { PaginationQuery } from "@ai-stock-advisor/shared";

export type PortfolioQueryState = Required<PaginationQuery>;

export function buildPortfolioQueryState({
  limit,
  page,
}: Required<PaginationQuery>): PortfolioQueryState {
  return { page, limit };
}

export function buildPortfolioQueryKey(state: PortfolioQueryState) {
  return ["portfolio", { page: state.page, limit: state.limit }] as const;
}

export function getPageAfterPortfolioFilterChange(): number {
  return 1;
}
