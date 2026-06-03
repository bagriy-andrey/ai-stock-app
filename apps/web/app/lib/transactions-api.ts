import type {
  CreatePortfolioTransactionRequest,
  PortfolioTransactionDto,
  TransactionFilters,
  UpdatePortfolioTransactionRequest,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

function authHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export function fetchTransactions(
  accessToken: string,
  filters: TransactionFilters = {},
): Promise<PortfolioTransactionDto[]> {
  const params = new URLSearchParams();

  if (filters.ticker) {
    params.set("ticker", filters.ticker);
  }

  if (filters.fromDate) {
    params.set("fromDate", filters.fromDate);
  }

  if (filters.toDate) {
    params.set("toDate", filters.toDate);
  }

  const query = params.toString();
  return apiRequest<PortfolioTransactionDto[]>(
    `/transactions${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken),
    },
  );
}

export function createTransaction(
  accessToken: string,
  input: CreatePortfolioTransactionRequest,
): Promise<PortfolioTransactionDto> {
  return apiRequest<PortfolioTransactionDto>("/transactions", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function updateTransaction(
  accessToken: string,
  id: string,
  input: UpdatePortfolioTransactionRequest,
): Promise<PortfolioTransactionDto> {
  return apiRequest<PortfolioTransactionDto>(`/transactions/${id}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function removeTransaction(
  accessToken: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/transactions/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}
