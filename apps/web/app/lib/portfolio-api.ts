import type {
  CreatePortfolioPositionRequest,
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

export function fetchPortfolio(accessToken: string): Promise<PortfolioDto> {
  return apiRequest<PortfolioDto>("/portfolio", {
    headers: authHeaders(accessToken),
  });
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
