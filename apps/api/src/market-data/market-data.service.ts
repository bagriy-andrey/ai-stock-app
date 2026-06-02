import { Inject, Injectable } from "@nestjs/common";
import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { InMemoryCacheService } from "./in-memory-cache.service";
import {
  MARKET_DATA_PROVIDER,
  type MarketDataProvider,
} from "./market-data-provider";

const QUOTE_TTL_MS = 2 * 60 * 1_000;
const COMPANY_PROFILE_TTL_MS = 24 * 60 * 60 * 1_000;
const SEARCH_TTL_MS = 60 * 60 * 1_000;

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
    private readonly cache: InMemoryCacheService,
  ) {}

  searchSymbols(query: string): Promise<StockSearchResult[]> {
    const normalizedQuery = query.trim().toLowerCase();

    return this.cache.getOrSet(
      `market-data:search:${normalizedQuery}`,
      SEARCH_TTL_MS,
      async () => {
        const results = await this.provider.searchSymbols(normalizedQuery);
        return Promise.all(
          results.map(async (result) => {
            if (result.exchange && result.currency) {
              return result;
            }

            try {
              const profile = await this.getCompanyProfile(result.ticker);
              return {
                ...result,
                name: profile.name || result.name,
                exchange: profile.exchange,
                currency: profile.currency,
              };
            } catch {
              return result;
            }
          }),
        );
      },
    );
  }

  getQuote(ticker: string): Promise<StockQuote> {
    const normalizedTicker = this.normalizeTicker(ticker);

    return this.cache.getOrSet(
      `market-data:quote:${normalizedTicker}`,
      QUOTE_TTL_MS,
      () => this.provider.getQuote(normalizedTicker),
    );
  }

  getQuotes(tickers: string[]): Promise<StockQuote[]> {
    return Promise.all(tickers.map((ticker) => this.getQuote(ticker)));
  }

  getCompanyProfile(ticker: string): Promise<CompanyProfile> {
    const normalizedTicker = this.normalizeTicker(ticker);

    return this.cache.getOrSet(
      `market-data:company:${normalizedTicker}`,
      COMPANY_PROFILE_TTL_MS,
      () => this.provider.getCompanyProfile(normalizedTicker),
    );
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }
}
