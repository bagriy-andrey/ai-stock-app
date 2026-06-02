import type {
  StockCandle,
  StockCandleRange,
} from "@ai-stock-advisor/shared";

export const HISTORICAL_MARKET_DATA_PROVIDER = Symbol(
  "HISTORICAL_MARKET_DATA_PROVIDER",
);

export interface HistoricalMarketDataProvider {
  getCandles(
    symbol: string,
    range: StockCandleRange,
  ): Promise<StockCandle[]>;
}
