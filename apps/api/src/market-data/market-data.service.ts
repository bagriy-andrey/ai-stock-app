import { Inject, Injectable } from "@nestjs/common";
import type {
  CompanyProfile,
  MarketMoversResponse,
  StockCandle,
  StockCandleRange,
  StockCandlesResponse,
  StockDetails,
  StockFundamentals,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { InMemoryCacheService } from "./in-memory-cache.service";
import {
  HISTORICAL_MARKET_DATA_PROVIDER,
  type HistoricalMarketDataProvider,
} from "./historical-market-data-provider";
import {
  MARKET_DATA_PROVIDER,
  type MarketDataProvider,
} from "./market-data-provider";
import {
  MARKET_MOVERS_PROVIDER,
  type MarketMoversProvider,
} from "./market-movers-provider";

const QUOTE_TTL_MS = 2 * 60 * 1_000;
const COMPANY_PROFILE_TTL_MS = 24 * 60 * 60 * 1_000;
const COMPANY_FUNDAMENTALS_TTL_MS = 24 * 60 * 60 * 1_000;
const SEARCH_TTL_MS = 60 * 60 * 1_000;
const CANDLES_TTL_MS = 5 * 60 * 1_000;
const MARKET_MOVERS_TTL_MS = 5 * 60 * 1_000;

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProvider,
    @Inject(HISTORICAL_MARKET_DATA_PROVIDER)
    private readonly historicalProvider: HistoricalMarketDataProvider,
    @Inject(MARKET_MOVERS_PROVIDER)
    private readonly marketMoversProvider: MarketMoversProvider,
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

  getCompanyFundamentals(ticker: string): Promise<Partial<StockFundamentals>> {
    const normalizedTicker = this.normalizeTicker(ticker);

    return this.cache.getOrSet(
      `market-data:fundamentals:${normalizedTicker}`,
      COMPANY_FUNDAMENTALS_TTL_MS,
      () => this.provider.getCompanyFundamentals(normalizedTicker),
    );
  }

  async getStockDetails(ticker: string): Promise<StockDetails> {
    const [profile, quote, fundamentals] = await Promise.all([
      this.getCompanyProfile(ticker),
      this.getQuote(ticker),
      this.getCompanyFundamentals(ticker).catch<Partial<StockFundamentals>>(
        () => ({}),
      ),
    ]);

    return {
      symbol: quote.ticker,
      name: profile.name,
      exchange: profile.exchange,
      currency: profile.currency,
      logoUrl: profile.logo,
      country: profile.country,
      ...(profile.webUrl ? { website: profile.webUrl } : {}),
      ...(profile.description ? { description: profile.description } : {}),
      ...(profile.ceo ? { ceo: profile.ceo } : {}),
      ...(profile.headquarters ? { headquarters: profile.headquarters } : {}),
      ...(profile.employees ? { employees: profile.employees } : {}),
      ...(profile.foundedYear ? { foundedYear: profile.foundedYear } : {}),
      currentPrice: quote.currentPrice,
      change: quote.change,
      percentChange: quote.changePercent,
      high: quote.highPrice,
      low: quote.lowPrice,
      open: quote.openPrice,
      previousClose: quote.previousClose,
      fundamentals: {
        marketCap:
          fundamentals.marketCap ?? profile.marketCapitalization ?? undefined,
        peRatio: fundamentals.peRatio,
        eps: fundamentals.eps,
        fiftyTwoWeekHigh: fundamentals.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: fundamentals.fiftyTwoWeekLow,
        sector: fundamentals.sector ?? profile.sector,
        industry: fundamentals.industry ?? profile.industry,
        exchange: fundamentals.exchange ?? profile.exchange,
        currency: fundamentals.currency ?? profile.currency,
      },
    };
  }

  async getCandles(
    ticker: string,
    range: StockCandleRange,
  ): Promise<StockCandlesResponse> {
    const normalizedTicker = this.normalizeTicker(ticker);
    const candles = await this.cache.getOrSet<StockCandle[]>(
      `market-data:candles:${normalizedTicker}:${range}`,
      CANDLES_TTL_MS,
      () => this.historicalProvider.getCandles(normalizedTicker, range),
    );

    return {
      symbol: normalizedTicker,
      range,
      candles,
    };
  }

  async getMarketMovers(limit?: number): Promise<MarketMoversResponse> {
    const marketMovers = await this.cache.getOrSet(
      "market-data:market-movers",
      MARKET_MOVERS_TTL_MS,
      () => this.marketMoversProvider.getMarketMovers(),
    );

    if (limit === undefined) {
      return marketMovers;
    }

    return {
      ...marketMovers,
      gainers: marketMovers.gainers.slice(0, limit),
      losers: marketMovers.losers.slice(0, limit),
    };
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }
}
