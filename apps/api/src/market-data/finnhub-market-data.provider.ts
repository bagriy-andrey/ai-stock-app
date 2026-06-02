import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { getRequiredEnv } from "../config/env";
import type { MarketDataProvider } from "./market-data-provider";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_TIMEOUT_MS = 5_000;
const SEARCH_RESULT_LIMIT = 5;

interface FinnhubSearchResponse {
  result?: FinnhubSearchResult[];
}

interface FinnhubSearchResult {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
  primaryExchange?: string;
  currency?: string;
}

interface FinnhubQuoteResponse {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
}

interface FinnhubCompanyProfileResponse {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
  marketCapitalization?: number;
  name?: string;
  ticker?: string;
  weburl?: string;
}

@Injectable()
export class FinnhubMarketDataProvider implements MarketDataProvider {
  private readonly apiKey = getRequiredEnv("FINNHUB_API_KEY");

  async searchSymbols(query: string): Promise<StockSearchResult[]> {
    const response = await this.request<FinnhubSearchResponse>("search", {
      q: query,
    });

    return (response.result ?? [])
      .filter((result) => Boolean(result.symbol))
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((result) => ({
        ticker: result.symbol?.trim().toUpperCase() ?? "",
        name: result.description ?? result.symbol ?? "",
        exchange: result.primaryExchange ?? "",
        type: result.type ?? "",
        currency: result.currency ?? "",
      }));
  }

  async getQuote(ticker: string): Promise<StockQuote> {
    const response = await this.request<FinnhubQuoteResponse>("quote", {
      symbol: ticker,
    });

    if (!response.t) {
      throw new NotFoundException(`No market quote found for ${ticker}`);
    }

    return {
      ticker,
      currentPrice: response.c ?? 0,
      change: response.d ?? 0,
      changePercent: response.dp ?? 0,
      previousClose: response.pc ?? 0,
      openPrice: response.o ?? 0,
      highPrice: response.h ?? 0,
      lowPrice: response.l ?? 0,
      timestamp: new Date(response.t * 1_000).toISOString(),
    };
  }

  getQuotes(tickers: string[]): Promise<StockQuote[]> {
    return Promise.all(tickers.map((ticker) => this.getQuote(ticker)));
  }

  async getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    const response = await this.request<FinnhubCompanyProfileResponse>(
      "stock/profile2",
      { symbol: ticker },
    );

    if (!response.ticker || !response.name) {
      throw new NotFoundException(`No company profile found for ${ticker}`);
    }

    return {
      ticker: response.ticker.trim().toUpperCase(),
      name: response.name,
      exchange: response.exchange ?? "",
      currency: response.currency ?? "",
      country: response.country ?? "",
      industry: response.finnhubIndustry || undefined,
      logo: response.logo || undefined,
      marketCapitalization: response.marketCapitalization,
      webUrl: response.weburl || undefined,
    };
  }

  private async request<T>(
    path: string,
    query: Record<string, string>,
  ): Promise<T> {
    const searchParams = new URLSearchParams({
      ...query,
      token: this.apiKey,
    });

    try {
      const response = await fetch(`${FINNHUB_BASE_URL}/${path}?${searchParams}`, {
        signal: AbortSignal.timeout(FINNHUB_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          "Market data provider is temporarily unavailable",
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        "Market data provider is temporarily unavailable",
      );
    }
  }
}
