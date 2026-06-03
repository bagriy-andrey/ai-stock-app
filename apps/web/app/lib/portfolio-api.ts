import type {
  CreatePortfolioPositionRequest,
  PaginationQuery,
  PortfolioAllocationDto,
  PortfolioDto,
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

export function fetchPortfolioAllocation(
  accessToken: string,
): Promise<PortfolioAllocationDto> {
  return apiRequest<PortfolioAllocationDto>("/portfolio/allocation", {
    headers: authHeaders(accessToken),
  });
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
