import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  MarketMover,
  MarketMoversResponse,
} from "@ai-stock-advisor/shared";
import type { MarketMoversProvider } from "./market-movers-provider";

const FMP_BASE_URL = "https://financialmodelingprep.com";
const FMP_TIMEOUT_MS = 5_000;
const DEFAULT_MARKET_MOVERS_LIMIT = 10;

interface FmpMarketMover {
  symbol?: unknown;
  name?: unknown;
  price?: unknown;
  change?: unknown;
  changesPercentage?: unknown;
}

@Injectable()
export class FmpMarketMoversProvider implements MarketMoversProvider {
  async getTopGainers(limit = DEFAULT_MARKET_MOVERS_LIMIT): Promise<MarketMover[]> {
    const movers = await this.request("/stable/biggest-gainers");

    return this.normalizeMovers(movers, "descending", limit);
  }

  async getTopLosers(limit = DEFAULT_MARKET_MOVERS_LIMIT): Promise<MarketMover[]> {
    const movers = await this.request("/stable/biggest-losers");

    return this.normalizeMovers(movers, "ascending", limit);
  }

  async getMarketMovers(): Promise<MarketMoversResponse> {
    const [gainers, losers] = await Promise.all([
      this.getTopGainers(),
      this.getTopLosers(),
    ]);

    return {
      gainers,
      losers,
      updatedAt: new Date().toISOString(),
    };
  }

  private normalizeMovers(
    records: FmpMarketMover[],
    direction: "ascending" | "descending",
    limit: number,
  ): MarketMover[] {
    return records
      .map((record) => this.normalizeMover(record))
      .filter((mover): mover is MarketMover => Boolean(mover))
      .sort((left, right) =>
        direction === "ascending"
          ? left.changesPercentage - right.changesPercentage
          : right.changesPercentage - left.changesPercentage,
      )
      .slice(0, Math.max(0, Math.floor(limit)));
  }

  private normalizeMover(record: FmpMarketMover): MarketMover | null {
    const symbol =
      typeof record.symbol === "string" ? record.symbol.trim().toUpperCase() : "";
    const price = parseFiniteNumber(record.price);
    const changesPercentage = parseFiniteNumber(record.changesPercentage);

    if (!symbol || price === null || changesPercentage === null) {
      return null;
    }

    return {
      symbol,
      name:
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : symbol,
      price,
      change: parseFiniteNumber(record.change) ?? 0,
      changesPercentage,
    };
  }

  private async request(path: string): Promise<FmpMarketMover[]> {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Market movers are temporarily unavailable",
      );
    }

    const searchParams = new URLSearchParams({ apikey: apiKey });

    try {
      const response = await fetch(`${FMP_BASE_URL}${path}?${searchParams}`, {
        signal: AbortSignal.timeout(FMP_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          "Market movers are temporarily unavailable",
        );
      }

      const body: unknown = await response.json();

      if (!Array.isArray(body)) {
        throw new ServiceUnavailableException(
          "Market movers are temporarily unavailable",
        );
      }

      return body as FmpMarketMover[];
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        "Market movers are temporarily unavailable",
      );
    }
  }
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().replace(/%$/, "");

  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}
