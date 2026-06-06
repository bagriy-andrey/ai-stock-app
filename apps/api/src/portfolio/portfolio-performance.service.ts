import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  PortfolioPerformancePointDto,
  PortfolioPerformanceRange,
  PortfolioTransactionDto,
  StockCandle,
  StockCandleRange,
  StockQuote,
} from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import { MarketDataService } from "../market-data/market-data.service";
import { TransactionsService } from "../transactions/transactions.service";
import {
  PortfolioSnapshot,
  PortfolioSnapshotDocument,
} from "./schemas/portfolio-snapshot.schema";

interface PositionState {
  ticker: string;
  buyQuantity: number;
  buyCostBasis: number;
  sellQuantity: number;
}

interface SnapshotInput {
  snapshotDate: Date;
  depositedCapital: number;
  portfolioValue: number;
  positionCount: number;
}

interface HistoricalPricePoint {
  dateKey: string;
  close: number;
}

const portfolioPerformanceRanges = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "ALL",
] as const;
const rangeToCandleRange: Record<PortfolioPerformanceRange, StockCandleRange> = {
  "1D": "1d",
  "1W": "1w",
  "1M": "1m",
  "3M": "3m",
  "6M": "6m",
  "1Y": "1y",
  "5Y": "5y",
  ALL: "all",
};

@Injectable()
export class PortfolioPerformanceService {
  constructor(
    @InjectModel(PortfolioSnapshot.name)
    private readonly portfolioSnapshotModel: Model<PortfolioSnapshotDocument>,
    private readonly transactionsService: TransactionsService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async getPerformanceForUser(
    userId: string,
    range: PortfolioPerformanceRange,
  ): Promise<PortfolioPerformancePointDto[]> {
    const normalizedRange = this.normalizeRange(range);

    // Rebuild the requested range from latest transactions on every request.
    // This keeps edits/deletes immediately visible while still persisting
    // idempotent daily snapshots for future digests and analytics.
    return this.recalculatePerformanceForUser(userId, normalizedRange);
  }

  async generateCurrentSnapshotForUser(userId: string): Promise<void> {
    const ownerId = this.toUserObjectId(userId);
    const transactions = await this.transactionsService.findAllForUser(userId);
    const today = this.startOfUtcDay(new Date());
    const states = this.aggregatePositionStates(transactions, today);
    const openStates = [...states.values()].filter(
      (state) => this.getOpenQuantity(state) > 0,
    );

    if (openStates.length === 0) {
      await this.upsertSnapshot(ownerId, {
        snapshotDate: today,
        depositedCapital: 0,
        portfolioValue: 0,
        positionCount: 0,
      });
      return;
    }

    const quotes = await this.marketDataService.getQuotes(
      openStates.map((state) => state.ticker),
    );
    const quotesByTicker = new Map(
      quotes.map((quote) => [this.normalizeTicker(quote.ticker), quote] as const),
    );
    const snapshot = this.buildSnapshotFromQuotes(today, openStates, quotesByTicker);

    await this.upsertSnapshot(ownerId, snapshot);
  }

  private async recalculatePerformanceForUser(
    userId: string,
    range: PortfolioPerformanceRange,
  ): Promise<PortfolioPerformancePointDto[]> {
    const ownerId = this.toUserObjectId(userId);
    const transactions = await this.transactionsService.findAllForUser(userId);
    const effectiveTransactions = transactions.filter(
      (transaction) => transaction.type === "BUY" || transaction.type === "SELL",
    );

    if (effectiveTransactions.length === 0) {
      return [];
    }

    const currentSnapshot = await this.calculateCurrentSnapshotForUser(
      effectiveTransactions,
    );
    const tickers = [
      ...new Set(
        effectiveTransactions.map((transaction) =>
          this.normalizeTicker(transaction.ticker),
        ),
      ),
    ];
    const candleRange = rangeToCandleRange[range];
    const historicalPrices = await this.getHistoricalPrices(tickers, candleRange);
    const dateKeys = this.getCommonDateKeys(historicalPrices);
    const filledHistoricalPrices = this.fillForwardHistoricalPrices(
      historicalPrices,
      dateKeys,
    );
    const startDate = this.getRangeStartDate(range, new Date());
    const snapshots = dateKeys
      .filter(
        (dateKey) =>
          !startDate || new Date(`${dateKey}T00:00:00.000Z`) >= startDate,
      )
      .map((dateKey) =>
        this.buildHistoricalSnapshot(
          new Date(`${dateKey}T00:00:00.000Z`),
          effectiveTransactions,
          filledHistoricalPrices,
        ),
      )
      .filter((snapshot) => snapshot.positionCount > 0);
    const snapshotsByDate = new Map(
      snapshots.map((snapshot) => [this.toDateKey(snapshot.snapshotDate), snapshot]),
    );

    // The final chart point is always current portfolio value from live quotes,
    // not the last stored or historical close value.
    if (currentSnapshot.positionCount > 0) {
      snapshotsByDate.set(this.toDateKey(currentSnapshot.snapshotDate), currentSnapshot);
    }

    const recalculatedSnapshots = [...snapshotsByDate.values()].sort(
      (left, right) => left.snapshotDate.getTime() - right.snapshotDate.getTime(),
    );

    if (recalculatedSnapshots.length > 0) {
      await this.upsertSnapshots(ownerId, recalculatedSnapshots);
    }

    return recalculatedSnapshots.map((snapshot) => ({
      date: this.toDateKey(snapshot.snapshotDate),
      depositedCapital: snapshot.depositedCapital,
      portfolioValue: snapshot.portfolioValue,
      totalValue: snapshot.portfolioValue,
      totalProfit: this.getTotalProfit(snapshot),
      totalReturnPercent: this.getTotalReturnPercent(snapshot),
      positionCount: snapshot.positionCount,
    }));
  }

  private async calculateCurrentSnapshotForUser(
    transactions: PortfolioTransactionDto[],
  ): Promise<SnapshotInput> {
    const today = this.startOfUtcDay(new Date());
    const states = this.aggregatePositionStates(transactions, today);
    const openStates = [...states.values()].filter(
      (state) => this.getOpenQuantity(state) > 0,
    );

    if (openStates.length === 0) {
      return {
        snapshotDate: today,
        depositedCapital: 0,
        portfolioValue: 0,
        positionCount: 0,
      };
    }

    const quotes = await this.marketDataService.getQuotes(
      openStates.map((state) => state.ticker),
    );
    const quotesByTicker = new Map(
      quotes.map((quote) => [this.normalizeTicker(quote.ticker), quote] as const),
    );

    return this.buildSnapshotFromQuotes(today, openStates, quotesByTicker);
  }

  private async getHistoricalPrices(
    tickers: string[],
    range: StockCandleRange,
  ): Promise<Map<string, Map<string, number>>> {
    const candlesByTicker = await Promise.all(
      tickers.map(async (ticker) => {
        const response = await this.marketDataService.getCandles(ticker, range);

        return {
          ticker,
          candles: response.candles,
        };
      }),
    );

    return new Map(
      candlesByTicker.map(({ ticker, candles }) => [
        ticker,
        new Map(
          this.toDailyClosePrices(candles).map(
            (point) => [point.dateKey, point.close] as const,
          ),
        ),
      ]),
    );
  }

  private toDailyClosePrices(candles: StockCandle[]): HistoricalPricePoint[] {
    const closesByDate = new Map<string, number>();

    for (const candle of candles) {
      closesByDate.set(
        this.toDateKey(new Date(candle.timestamp * 1_000)),
        candle.close,
      );
    }

    return [...closesByDate.entries()]
      .map(([dateKey, close]) => ({ dateKey, close }))
      .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
  }

  private getCommonDateKeys(
    historicalPrices: Map<string, Map<string, number>>,
  ): string[] {
    const allDateKeys = new Set<string>();

    for (const pricesByDate of historicalPrices.values()) {
      for (const dateKey of pricesByDate.keys()) {
        allDateKeys.add(dateKey);
      }
    }

    return [...allDateKeys].sort();
  }

  private fillForwardHistoricalPrices(
    historicalPrices: Map<string, Map<string, number>>,
    dateKeys: string[],
  ): Map<string, Map<string, number>> {
    return new Map(
      [...historicalPrices.entries()].map(([ticker, pricesByDate]) => {
        const filledPrices = new Map<string, number>();
        let lastClose: number | undefined;

        for (const dateKey of dateKeys) {
          const close = pricesByDate.get(dateKey);

          if (close !== undefined) {
            lastClose = close;
          }

          if (lastClose !== undefined) {
            filledPrices.set(dateKey, lastClose);
          }
        }

        return [ticker, filledPrices] as const;
      }),
    );
  }

  private buildHistoricalSnapshot(
    snapshotDate: Date,
    transactions: PortfolioTransactionDto[],
    historicalPrices: Map<string, Map<string, number>>,
  ): SnapshotInput {
    const states = this.aggregatePositionStates(transactions, snapshotDate);
    let portfolioValue = 0;
    let depositedCapital = 0;
    let positionCount = 0;
    const dateKey = this.toDateKey(snapshotDate);

    for (const state of states.values()) {
      const quantity = this.getOpenQuantity(state);

      if (quantity <= 0) {
        continue;
      }

      const close = historicalPrices.get(state.ticker)?.get(dateKey);

      if (close === undefined) {
        continue;
      }

      portfolioValue += quantity * close;
      depositedCapital += this.getOpenCostBasis(state);
      positionCount += 1;
    }

    return {
      snapshotDate,
      depositedCapital,
      portfolioValue,
      positionCount,
    };
  }

  private buildSnapshotFromQuotes(
    snapshotDate: Date,
    states: PositionState[],
    quotesByTicker: Map<string, StockQuote>,
  ): SnapshotInput {
    let portfolioValue = 0;
    let depositedCapital = 0;
    let positionCount = 0;

    for (const state of states) {
      const quote = quotesByTicker.get(state.ticker);

      if (!quote) {
        throw new Error(`Quote missing for ${state.ticker}`);
      }

      const quantity = this.getOpenQuantity(state);
      portfolioValue += quantity * quote.currentPrice;
      depositedCapital += this.getOpenCostBasis(state);
      positionCount += 1;
    }

    return {
      snapshotDate,
      depositedCapital,
      portfolioValue,
      positionCount,
    };
  }

  private aggregatePositionStates(
    transactions: PortfolioTransactionDto[],
    snapshotDate: Date,
  ): Map<string, PositionState> {
    const endOfSnapshotDay = this.endOfUtcDay(snapshotDate).getTime();
    const states = new Map<string, PositionState>();
    const sortedTransactions = [...transactions].sort((left, right) => {
      const dateDifference =
        new Date(left.transactionDate).getTime() -
        new Date(right.transactionDate).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });

    for (const transaction of sortedTransactions) {
      if (transaction.type !== "BUY" && transaction.type !== "SELL") {
        continue;
      }

      if (new Date(transaction.transactionDate).getTime() > endOfSnapshotDay) {
        continue;
      }

      const ticker = this.normalizeTicker(transaction.ticker);
      const state =
        states.get(ticker) ??
        ({
          ticker,
          buyQuantity: 0,
          buyCostBasis: 0,
          sellQuantity: 0,
        } satisfies PositionState);

      if (transaction.type === "BUY") {
        state.buyQuantity += transaction.quantity;
        state.buyCostBasis += transaction.quantity * transaction.price;
      } else {
        state.sellQuantity += transaction.quantity;
      }

      states.set(ticker, state);
    }

    return states;
  }

  private async upsertSnapshots(
    userId: Types.ObjectId,
    snapshots: SnapshotInput[],
  ): Promise<void> {
    await this.portfolioSnapshotModel.bulkWrite(
      snapshots.map((snapshot) => ({
        updateOne: {
          filter: {
            userId,
            snapshotDate: snapshot.snapshotDate,
          },
          update: {
            $set: {
              depositedCapital: snapshot.depositedCapital,
              portfolioValue: snapshot.portfolioValue,
              totalValue: snapshot.portfolioValue,
              totalCost: snapshot.depositedCapital,
              totalProfit: this.getTotalProfit(snapshot),
              totalReturnPercent: this.getTotalReturnPercent(snapshot),
              positionCount: snapshot.positionCount,
            },
          },
          upsert: true,
        },
      })),
    );
  }

  private async upsertSnapshot(
    userId: Types.ObjectId,
    snapshot: SnapshotInput,
  ): Promise<void> {
    await this.upsertSnapshots(userId, [snapshot]);
  }

  private toPerformancePoint(
    snapshot: PortfolioSnapshotDocument,
  ): PortfolioPerformancePointDto {
    const depositedCapital = snapshot.depositedCapital ?? snapshot.totalCost;
    const portfolioValue = snapshot.portfolioValue ?? snapshot.totalValue;
    const totalProfit = portfolioValue - depositedCapital;

    return {
      date: this.toDateKey(snapshot.snapshotDate),
      depositedCapital,
      portfolioValue,
      totalValue: portfolioValue,
      totalProfit,
      totalReturnPercent:
        depositedCapital <= 0 ? 0 : (totalProfit / depositedCapital) * 100,
      positionCount: snapshot.positionCount,
    };
  }

  private getTotalProfit(snapshot: SnapshotInput): number {
    return snapshot.portfolioValue - snapshot.depositedCapital;
  }

  private getTotalReturnPercent(snapshot: SnapshotInput): number {
    if (snapshot.depositedCapital <= 0) {
      return 0;
    }

    return (this.getTotalProfit(snapshot) / snapshot.depositedCapital) * 100;
  }

  private getOpenQuantity(state: PositionState): number {
    return state.buyQuantity - state.sellQuantity;
  }

  private getOpenCostBasis(state: PositionState): number {
    const quantity = this.getOpenQuantity(state);

    if (quantity <= 0 || state.buyQuantity <= 0) {
      return 0;
    }

    return quantity * (state.buyCostBasis / state.buyQuantity);
  }

  private getRangeStartDate(
    range: PortfolioPerformanceRange,
    now: Date,
  ): Date | null {
    if (range === "ALL") {
      return null;
    }

    const start = this.startOfUtcDay(now);

    if (range === "1M") {
      start.setUTCMonth(start.getUTCMonth() - 1);
    } else if (range === "1D") {
      start.setUTCDate(start.getUTCDate() - 1);
    } else if (range === "1W") {
      start.setUTCDate(start.getUTCDate() - 7);
    } else if (range === "3M") {
      start.setUTCMonth(start.getUTCMonth() - 3);
    } else if (range === "6M") {
      start.setUTCMonth(start.getUTCMonth() - 6);
    } else if (range === "5Y") {
      start.setUTCFullYear(start.getUTCFullYear() - 5);
    } else {
      start.setUTCFullYear(start.getUTCFullYear() - 1);
    }

    return start;
  }

  private normalizeRange(range: PortfolioPerformanceRange): PortfolioPerformanceRange {
    if (!portfolioPerformanceRanges.includes(range)) {
      throw new BadRequestException(
        "range must be one of 1D, 1W, 1M, 3M, 6M, 1Y, 5Y, ALL",
      );
    }

    return range;
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private endOfUtcDay(date: Date): Date {
    const end = this.startOfUtcDay(date);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toUserObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    return new Types.ObjectId(userId);
  }
}
