import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";

export const MARKET_DATA_PROVIDER = Symbol("MARKET_DATA_PROVIDER");

export interface MarketDataProvider {
  searchSymbols(query: string): Promise<StockSearchResult[]>;
  getQuote(ticker: string): Promise<StockQuote>;
  getQuotes(tickers: string[]): Promise<StockQuote[]>;
  getCompanyProfile(ticker: string): Promise<CompanyProfile>;
}
