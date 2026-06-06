import type {
  CreatePortfolioPositionRequest,
  PaginationQuery,
  PortfolioAllocationDto,
  PortfolioDto,
  PortfolioPerformancePointDto,
  PortfolioPerformanceRange,
  PortfolioPositionDto,
  UpdatePortfolioPositionRequest,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

function authHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export function fetchPortfolio(
  accessToken: string,
  pagination: PaginationQuery = {},
): Promise<PortfolioDto> {
  const params = buildPortfolioSearchParams(pagination);
  const query = params.toString();

  return apiRequest<PortfolioDto>(`/portfolio${query ? `?${query}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export async function fetchAllPortfolio(
  accessToken: string,
): Promise<PortfolioDto> {
  const firstPage = await fetchPortfolio(accessToken, { page: 1, limit: 100 });
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.meta.totalPages - 1) },
    (_, index) => index + 2,
  );

  if (remainingPages.length === 0) {
    return firstPage;
  }

  const additionalPages = await Promise.all(
    remainingPages.map((page) =>
      fetchPortfolio(accessToken, { page, limit: firstPage.meta.limit }),
    ),
  );

  return {
    ...firstPage,
    items: [
      ...firstPage.items,
      ...additionalPages.flatMap((page) => page.items),
    ],
  };
}

export function fetchPortfolioAllocation(
  accessToken: string,
): Promise<PortfolioAllocationDto> {
  return apiRequest<PortfolioAllocationDto>("/portfolio/allocation", {
    headers: authHeaders(accessToken),
  });
}

export function fetchPortfolioPerformance(
  accessToken: string,
  range: PortfolioPerformanceRange,
): Promise<PortfolioPerformancePointDto[]> {
  return apiRequest<PortfolioPerformancePointDto[]>(
    `/portfolio/performance?range=${range}`,
    {
      headers: authHeaders(accessToken),
    },
  );
}

export function buildPortfolioSearchParams(
  pagination: PaginationQuery = {},
): URLSearchParams {
  const params = new URLSearchParams();

  if (pagination.page !== undefined) {
    params.set("page", String(pagination.page));
  }

  if (pagination.limit !== undefined) {
    params.set("limit", String(pagination.limit));
  }

  return params;
}

export function createPortfolioPosition(
  accessToken: string,
  input: CreatePortfolioPositionRequest,
): Promise<PortfolioPositionDto> {
  return apiRequest<PortfolioPositionDto>("/portfolio", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function updatePortfolioPosition(
  accessToken: string,
  id: string,
  input: UpdatePortfolioPositionRequest,
): Promise<PortfolioPositionDto> {
  return apiRequest<PortfolioPositionDto>(`/portfolio/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function removePortfolioPosition(
  accessToken: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/portfolio/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}
