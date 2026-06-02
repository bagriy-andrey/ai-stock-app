import type { MarketMoversResponse } from "@ai-stock-advisor/shared";

export const MARKET_MOVERS_PROVIDER = Symbol("MARKET_MOVERS_PROVIDER");

export interface MarketMoversProvider {
  getMarketMovers(): Promise<MarketMoversResponse>;
}
