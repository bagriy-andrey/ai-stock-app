import type {
  PortfolioTransactionDto,
  StockCandlesResponse,
  StockQuote,
} from "@ai-stock-advisor/shared";
import { Types } from "mongoose";
import type { MarketDataService } from "../market-data/market-data.service";
import type { TransactionsService } from "../transactions/transactions.service";
import { PortfolioPerformanceService } from "./portfolio-performance.service";

function buildTransaction(
  overrides: Partial<PortfolioTransactionDto> = {},
): PortfolioTransactionDto {
  return {
    id: "tx-1",
    userId: "665daec06c456275631b7af1",
    ticker: "AAPL",
    companyName: "Apple Inc.",
    type: "BUY",
    quantity: 1,
    price: 100,
    currency: "USD",
    transactionDate: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildCandles(
  symbol: string,
  closes: Array<[string, number]>,
): StockCandlesResponse {
  return {
    symbol,
    range: "1m",
    candles: closes.map(([date, close]) => ({
      timestamp: Math.floor(new Date(`${date}T00:00:00.000Z`).getTime() / 1_000),
      open: close,
      high: close,
      low: close,
      close,
      volume: 1000,
    })),
  };
}

describe("PortfolioPerformanceService", () => {
  const snapshotModel = {
    find: jest.fn(),
    bulkWrite: jest.fn(),
  };
  const transactionsService = {
    findAllForUser: jest.fn(),
  } as unknown as jest.Mocked<TransactionsService>;
  const marketDataService = {
    getCandles: jest.fn(),
    getQuotes: jest.fn(),
  } as unknown as jest.Mocked<MarketDataService>;
  const service = new PortfolioPerformanceService(
    snapshotModel as never,
    transactionsService,
    marketDataService,
  );
  const userId = "665daec06c456275631b7af1";

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    snapshotModel.bulkWrite.mockResolvedValue({});
  });

  it("returns no performance points when the user has no transactions", async () => {
    transactionsService.findAllForUser.mockResolvedValue([]);

    await expect(service.getPerformanceForUser(userId, "3M")).resolves.toEqual([]);
    expect(snapshotModel.find).not.toHaveBeenCalled();
    expect(snapshotModel.bulkWrite).not.toHaveBeenCalled();
  });

  it("recalculates performance snapshots from latest transactions and appends live current value", async () => {
    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({
        id: "buy-aapl",
        ticker: "AAPL",
        quantity: 2,
        price: 100,
        transactionDate: "2026-05-01T00:00:00.000Z",
      }),
      buildTransaction({
        id: "buy-msft",
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        quantity: 1,
        price: 200,
        transactionDate: "2026-05-02T00:00:00.000Z",
        createdAt: "2026-05-02T00:00:00.000Z",
      }),
      buildTransaction({
        id: "sell-aapl",
        ticker: "AAPL",
        type: "SELL",
        quantity: 1,
        price: 130,
        transactionDate: "2026-05-03T00:00:00.000Z",
        createdAt: "2026-05-03T00:00:00.000Z",
      }),
    ]);
    marketDataService.getCandles.mockImplementation(async (ticker) =>
      ticker === "AAPL"
        ? buildCandles("AAPL", [
            ["2026-05-01", 110],
            ["2026-05-02", 120],
            ["2026-05-03", 130],
          ])
        : buildCandles("MSFT", [
            ["2026-05-01", 210],
            ["2026-05-02", 220],
          ]),
    );
    marketDataService.getQuotes.mockResolvedValue([
      {
        ticker: "AAPL",
        currentPrice: 140,
        change: 1,
        changePercent: 1,
        previousClose: 139,
        openPrice: 139,
        highPrice: 141,
        lowPrice: 138,
        timestamp: "2026-06-06T12:00:00.000Z",
        currency: "USD",
      },
      {
        ticker: "MSFT",
        currentPrice: 240,
        change: 1,
        changePercent: 1,
        previousClose: 239,
        openPrice: 239,
        highPrice: 241,
        lowPrice: 238,
        timestamp: "2026-06-06T12:00:00.000Z",
        currency: "USD",
      },
    ]);

    await expect(service.getPerformanceForUser(userId, "3M")).resolves.toEqual([
      {
        date: "2026-05-01",
        depositedCapital: 200,
        portfolioValue: 220,
        totalValue: 220,
        totalProfit: 20,
        totalReturnPercent: 10,
        positionCount: 1,
      },
      {
        date: "2026-05-02",
        depositedCapital: 400,
        portfolioValue: 460,
        totalValue: 460,
        totalProfit: 60,
        totalReturnPercent: 15,
        positionCount: 2,
      },
      {
        date: "2026-05-03",
        depositedCapital: 300,
        portfolioValue: 350,
        totalValue: 350,
        totalProfit: 50,
        totalReturnPercent: 16.666666666666664,
        positionCount: 2,
      },
      {
        date: "2026-06-06",
        depositedCapital: 300,
        portfolioValue: 380,
        totalValue: 380,
        totalProfit: 80,
        totalReturnPercent: 26.666666666666668,
        positionCount: 2,
      },
    ]);
    expect(marketDataService.getCandles).toHaveBeenCalledWith("AAPL", "3m");
    expect(marketDataService.getCandles).toHaveBeenCalledWith("MSFT", "3m");
    expect(marketDataService.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
    expect(snapshotModel.bulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: {
              userId: new Types.ObjectId(userId),
              snapshotDate: new Date("2026-05-03T00:00:00.000Z"),
            },
            update: {
              $set: {
                depositedCapital: 300,
                portfolioValue: 350,
                totalValue: 350,
                totalCost: 300,
                totalProfit: 50,
                totalReturnPercent: 16.666666666666664,
                positionCount: 2,
              },
            },
            upsert: true,
          }),
        }),
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: {
              userId: new Types.ObjectId(userId),
              snapshotDate: new Date("2026-06-06T00:00:00.000Z"),
            },
            update: {
              $set: {
                depositedCapital: 300,
                portfolioValue: 380,
                totalValue: 380,
                totalCost: 300,
                totalProfit: 80,
                totalReturnPercent: 26.666666666666668,
                positionCount: 2,
              },
            },
            upsert: true,
          }),
        }),
      ]),
    );
  });

  it.each([
    ["1D", "1d"],
    ["1W", "1w"],
    ["5Y", "5y"],
    ["ALL", "all"],
  ] as const)("maps %s performance range to %s candles", async (range, candlesRange) => {
    transactionsService.findAllForUser.mockResolvedValue([buildTransaction()]);
    marketDataService.getCandles.mockResolvedValue(
      buildCandles("AAPL", [["2026-06-06", 150]]),
    );
    marketDataService.getQuotes.mockResolvedValue([
      {
        ticker: "AAPL",
        currentPrice: 151,
        change: 1,
        changePercent: 1,
        previousClose: 150,
        openPrice: 150,
        highPrice: 152,
        lowPrice: 149,
        timestamp: "2026-06-06T12:00:00.000Z",
        currency: "USD",
      },
    ]);

    await service.getPerformanceForUser(userId, range);

    expect(marketDataService.getCandles).toHaveBeenCalledWith(
      "AAPL",
      candlesRange,
    );
  });

  it("generates the current daily snapshot from live quotes", async () => {
    const quote: StockQuote = {
      ticker: "AAPL",
      currentPrice: 150,
      change: 1,
      changePercent: 1,
      previousClose: 149,
      openPrice: 149,
      highPrice: 151,
      lowPrice: 148,
      timestamp: "2026-06-06T12:00:00.000Z",
      currency: "USD",
    };

    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({ quantity: 2, price: 100 }),
      buildTransaction({
        id: "sell-aapl",
        type: "SELL",
        quantity: 1,
        price: 140,
        transactionDate: "2026-05-03T00:00:00.000Z",
        createdAt: "2026-05-03T00:00:00.000Z",
      }),
    ]);
    marketDataService.getQuotes.mockResolvedValue([quote]);

    await service.generateCurrentSnapshotForUser(userId);

    expect(marketDataService.getQuotes).toHaveBeenCalledWith(["AAPL"]);
    expect(snapshotModel.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: {
            userId: new Types.ObjectId(userId),
            snapshotDate: new Date("2026-06-06T00:00:00.000Z"),
          },
          update: {
            $set: {
              depositedCapital: 100,
              portfolioValue: 150,
              totalValue: 150,
              totalCost: 100,
              totalProfit: 50,
              totalReturnPercent: 50,
              positionCount: 1,
            },
          },
          upsert: true,
        },
      },
    ]);
  });
});
