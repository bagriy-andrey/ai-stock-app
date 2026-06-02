import type {
  GetQuotesRequest,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

function authHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export function searchMarketSymbols(
  accessToken: string,
  query: string,
): Promise<StockSearchResult[]> {
  return apiRequest<StockSearchResult[]>(
    `/market-data/search?query=${encodeURIComponent(query)}`,
    { headers: authHeaders(accessToken) },
  );
}

export function fetchMarketQuotes(
  accessToken: string,
  input: GetQuotesRequest,
): Promise<StockQuote[]> {
  return apiRequest<StockQuote[]>("/market-data/quotes", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}
