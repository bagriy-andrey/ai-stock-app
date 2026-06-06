import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  StockCandle,
  StockCandleRange,
} from "@ai-stock-advisor/shared";
import YahooFinance from "yahoo-finance2";
import type { HistoricalMarketDataProvider } from "./historical-market-data-provider";

const YAHOO_FINANCE_TIMEOUT_MS = 5_000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

type YahooChartInterval = "5m" | "1h" | "1d" | "1wk";
type YahooChartPeriod = "1d" | "7d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "all";

interface YahooChartQuote {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface YahooFinanceClient {
  chart(
    symbol: string,
    options: {
      period1: Date;
      period2: Date;
      interval: YahooChartInterval;
    },
  ): Promise<{ quotes: YahooChartQuote[] }>;
}

interface YahooChartConfig {
  period: YahooChartPeriod;
  interval: YahooChartInterval;
}

const YAHOO_CHART_CONFIG: Record<StockCandleRange, YahooChartConfig> = {
  "1d": { period: "1d", interval: "5m" },
  "1w": { period: "7d", interval: "1h" },
  "1m": { period: "1mo", interval: "1d" },
  "3m": { period: "3mo", interval: "1d" },
  "6m": { period: "6mo", interval: "1d" },
  "1y": { period: "1y", interval: "1d" },
  "5y": { period: "5y", interval: "1wk" },
  all: { period: "all", interval: "1wk" },
};

@Injectable()
export class YahooFinanceProvider implements HistoricalMarketDataProvider {
  constructor(
    private readonly yahooFinance: YahooFinanceClient = new YahooFinance(),
  ) {}

  async getCandles(
    symbol: string,
    range: StockCandleRange,
  ): Promise<StockCandle[]> {
    const now = new Date();
    const config = YAHOO_CHART_CONFIG[range];

    try {
      const response = await withTimeout(
        this.yahooFinance.chart(symbol, {
          period1: getPeriodStart(now, config.period),
          period2: now,
          interval: config.interval,
        }),
        YAHOO_FINANCE_TIMEOUT_MS,
      );

      return response.quotes
        .filter(isCompleteYahooChartQuote)
        .map((quote) => ({
          timestamp: Math.floor(quote.date.getTime() / 1_000),
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.close,
          volume: quote.volume,
        }))
        .sort((left, right) => left.timestamp - right.timestamp);
    } catch (error) {
      if (isInvalidSymbolError(error)) {
        throw new NotFoundException(
          `No historical market data found for ${symbol}`,
        );
      }

      throw new ServiceUnavailableException(
        "Historical market data provider is temporarily unavailable",
      );
    }
  }
}

function getPeriodStart(now: Date, period: YahooChartPeriod): Date {
  const start = new Date(now);

  if (period === "1d") {
    return new Date(start.getTime() - MILLISECONDS_PER_DAY);
  }

  if (period === "7d") {
    return new Date(start.getTime() - 7 * MILLISECONDS_PER_DAY);
  }

  if (period === "1mo") {
    start.setUTCMonth(start.getUTCMonth() - 1);
    return start;
  }

  if (period === "3mo") {
    start.setUTCMonth(start.getUTCMonth() - 3);
    return start;
  }

  if (period === "6mo") {
    start.setUTCMonth(start.getUTCMonth() - 6);
    return start;
  }

  if (period === "5y") {
    start.setUTCFullYear(start.getUTCFullYear() - 5);
    return start;
  }

  if (period === "all") {
    return new Date("1970-01-01T00:00:00.000Z");
  }

  start.setUTCFullYear(start.getUTCFullYear() - 1);
  return start;
}

function isCompleteYahooChartQuote(
  quote: YahooChartQuote,
): quote is YahooChartQuote & {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} {
  return (
    quote.date instanceof Date &&
    Number.isFinite(quote.date.getTime()) &&
    [quote.open, quote.high, quote.low, quote.close, quote.volume].every(
      isFiniteNumber,
    )
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInvalidSymbolError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /no data found|not found|invalid symbol|delisted/i.test(error.message)
  );
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMilliseconds: number,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Yahoo Finance request timed out")),
          timeoutMilliseconds,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
