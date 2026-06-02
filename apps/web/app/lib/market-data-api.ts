import type {
  CompanyProfile,
  GetQuotesRequest,
  MarketMoversResponse,
  StockCandle,
  StockCandleRange,
  StockCandlesResponse,
  StockDetails,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

export interface StockChartCandle extends Omit<StockCandle, "timestamp"> {
  timestamp: string;
}

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

export function fetchCompanyProfile(
  accessToken: string,
  ticker: string,
): Promise<CompanyProfile> {
  return apiRequest<CompanyProfile>(`/market-data/company/${ticker}`, {
    headers: authHeaders(accessToken),
  });
}

export function fetchMarketMovers(
  accessToken: string,
): Promise<MarketMoversResponse> {
  return apiRequest<MarketMoversResponse>("/market/movers", {
    headers: authHeaders(accessToken),
  });
}

export function fetchStockDetails(
  accessToken: string,
  ticker: string,
): Promise<StockDetails> {
  return apiRequest<StockDetails>(`/market/stocks/${ticker}/details`, {
    headers: authHeaders(accessToken),
  });
}

export function fetchStockCandles(
  accessToken: string,
  ticker: string,
  range: StockCandleRange,
): Promise<StockChartCandle[]> {
  return apiRequest<StockCandlesResponse>(
    `/market/stocks/${ticker}/candles?range=${range}`,
    { headers: authHeaders(accessToken) },
  ).then((response) =>
    response.candles.map((candle) => ({
      ...candle,
      timestamp: new Date(candle.timestamp * 1_000).toISOString(),
    })),
  );
}
