import type {
  CreatePortfolioTransactionRequest,
  PaginatedTransactionsDto,
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
): Promise<PaginatedTransactionsDto> {
  const params = buildTransactionsSearchParams(filters);
  const query = params.toString();

  return apiRequest<PaginatedTransactionsDto>(
    `/transactions${query ? `?${query}` : ""}`,
    {
      headers: authHeaders(accessToken),
    },
  );
}

export async function fetchAllTransactions(
  accessToken: string,
  filters: TransactionFilters = {},
): Promise<PaginatedTransactionsDto> {
  const firstPage = await fetchTransactions(accessToken, {
    ...filters,
    page: 1,
    limit: 100,
  });
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.meta.totalPages - 1) },
    (_, index) => index + 2,
  );

  if (remainingPages.length === 0) {
    return firstPage;
  }

  const additionalPages = await Promise.all(
    remainingPages.map((page) =>
      fetchTransactions(accessToken, {
        ...filters,
        page,
        limit: firstPage.meta.limit,
      }),
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

export function buildTransactionsSearchParams(
  filters: TransactionFilters = {},
): URLSearchParams {
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

  if (filters.page !== undefined) {
    params.set("page", String(filters.page));
  }

  if (filters.limit !== undefined) {
    params.set("limit", String(filters.limit));
  }

  return params;
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
