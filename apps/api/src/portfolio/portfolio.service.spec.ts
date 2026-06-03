import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  PortfolioTransactionDto,
  StockQuote,
} from "@ai-stock-advisor/shared";
import { Types } from "mongoose";
import type { MarketDataService } from "../market-data/market-data.service";
import type { TransactionsService } from "../transactions/transactions.service";
import { PortfolioService } from "./portfolio.service";
import type { PortfolioPositionDocument } from "./schemas/portfolio-position.schema";

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
    price: 150,
    currency: "USD",
    transactionDate: "2026-05-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PortfolioService", () => {
  const portfolioPositionModel = {
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    collection: {
      createIndex: jest.fn(),
      dropIndex: jest.fn(),
      indexes: jest.fn(),
    },
  };
  const marketDataService = {
    getQuote: jest.fn(),
    getQuotes: jest.fn(),
  } as unknown as jest.Mocked<MarketDataService>;
  const transactionsService = {
    createForUser: jest.fn(),
    findAllForUser: jest.fn(),
  } as unknown as jest.Mocked<TransactionsService>;
  const service = new PortfolioService(
    portfolioPositionModel as never,
    marketDataService,
    transactionsService,
  );
  const userId = new Types.ObjectId("665daec06c456275631b7af1");
  const otherUserId = new Types.ObjectId("665daec06c456275631b7af2");
  const positionId = new Types.ObjectId("665daec06c456275631b7af3");
  const now = new Date("2026-06-02T09:00:00.000Z");
  const position = {
    _id: positionId,
    userId,
    ticker: "AAPL",
    companyName: "Apple Inc.",
    quantity: 2,
    averagePurchasePrice: 150,
    currency: "USD",
    purchaseDate: new Date("2026-05-01T00:00:00.000Z"),
    notes: "Core holding",
    createdAt: now,
    updatedAt: now,
  } as unknown as PortfolioPositionDocument;
  const quote: StockQuote = {
    ticker: "AAPL",
    currentPrice: 180,
    change: 2,
    changePercent: 1.12,
    previousClose: 178,
    openPrice: 179,
    highPrice: 181,
    lowPrice: 177,
    timestamp: now.toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replaces the legacy unique user ticker index with a non-unique index", async () => {
    portfolioPositionModel.collection.indexes.mockResolvedValue([
      { key: { _id: 1 }, name: "_id_" },
      {
        key: { userId: 1, ticker: 1 },
        name: "userId_1_ticker_1",
        unique: true,
      },
    ]);

    await service.onModuleInit();

    expect(portfolioPositionModel.collection.dropIndex).toHaveBeenCalledWith(
      "userId_1_ticker_1",
    );
    expect(portfolioPositionModel.collection.createIndex).toHaveBeenCalledWith(
      { userId: 1, ticker: 1 },
      { name: "portfolio_user_ticker" },
    );
  });

  it("creates and values a normalized position", async () => {
    portfolioPositionModel.create.mockResolvedValue(position);
    marketDataService.getQuote.mockResolvedValue(quote);

    await expect(
      service.createForUser(userId.toString(), {
        ticker: " aapl ",
        companyName: " Apple Inc. ",
        quantity: 2,
        averagePurchasePrice: 150,
        currency: " usd ",
        purchaseDate: "2026-05-01",
        notes: " Core holding ",
      }),
    ).resolves.toMatchObject({
      ticker: "AAPL",
      currentPrice: 180,
      costBasis: 300,
      currentValue: 360,
      profitLoss: 60,
      profitLossPercent: 20,
    });

    expect(portfolioPositionModel.create).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
      companyName: "Apple Inc.",
      quantity: 2,
      averagePurchasePrice: 150,
      currency: "USD",
      purchaseDate: new Date("2026-05-01"),
      notes: "Core holding",
    });
    expect(transactionsService.createForUser).toHaveBeenCalledWith(
      userId.toString(),
      {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        type: "BUY",
        quantity: 2,
        price: 150,
        currency: "USD",
        transactionDate: "2026-05-01T00:00:00.000Z",
        notes: "Core holding",
      },
    );
  });

  it("returns aggregated open positions from buy and sell transactions", async () => {
    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({
        id: "tx-4",
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        quantity: 1,
        price: 200,
        transactionDate: "2026-05-04T00:00:00.000Z",
      }),
      buildTransaction({
        id: "tx-3",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        type: "SELL",
        quantity: 1,
        price: 320,
        transactionDate: "2026-05-03T00:00:00.000Z",
      }),
      buildTransaction({
        id: "tx-2",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 1,
        price: 310.2,
        transactionDate: "2026-05-02T00:00:00.000Z",
      }),
      buildTransaction({
        id: "tx-1",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 1,
        price: 315.2,
        transactionDate: "2026-05-01T00:00:00.000Z",
      }),
      buildTransaction({
        id: "tx-ignored",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        type: "UPDATE",
        quantity: 10,
        price: 1,
        transactionDate: "2026-05-05T00:00:00.000Z",
      }),
    ]);
    marketDataService.getQuotes.mockResolvedValue([
      quote,
      {
        ...quote,
        ticker: "MSFT",
        currentPrice: 240,
      },
    ]);

    await expect(service.findAllForUser(userId.toString())).resolves.toEqual({
      items: [
        {
          ticker: "AAPL",
          companyName: "Apple Inc.",
          quantity: 1,
          averagePurchasePrice: 312.7,
          currentPrice: 180,
          costBasis: 312.7,
          currentValue: 180,
          profitLoss: -132.7,
          profitLossPercent: (-132.7 / 312.7) * 100,
          currency: "USD",
        },
        {
          ticker: "MSFT",
          companyName: "Microsoft Corporation",
          quantity: 1,
          averagePurchasePrice: 200,
          currentPrice: 240,
          costBasis: 200,
          currentValue: 240,
          profitLoss: 40,
          profitLossPercent: 20,
          currency: "USD",
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      summary: {
        totalCostBasis: 512.7,
        totalCurrentValue: 420,
        totalProfitLoss: -92.69999999999999,
        totalProfitLossPercent: (-92.69999999999999 / 512.7) * 100,
        totalStocksCount: 2,
        positionsCount: 2,
      },
    });

    expect(portfolioPositionModel.find).not.toHaveBeenCalled();
    expect(transactionsService.findAllForUser).toHaveBeenCalledWith(
      userId.toString(),
    );
    expect(marketDataService.getQuotes).toHaveBeenCalledWith(["AAPL", "MSFT"]);
  });

  it("paginates portfolio positions after ticker aggregation", async () => {
    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({
        id: "tx-aapl-1",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 1,
        price: 100,
      }),
      buildTransaction({
        id: "tx-aapl-2",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 2,
        price: 200,
      }),
      buildTransaction({
        id: "tx-msft",
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        quantity: 1,
        price: 300,
      }),
      buildTransaction({
        id: "tx-nvda",
        ticker: "NVDA",
        companyName: "NVIDIA Corporation",
        quantity: 1,
        price: 400,
      }),
    ]);
    marketDataService.getQuotes.mockResolvedValue([
      { ...quote, ticker: "AAPL", currentPrice: 150 },
      { ...quote, ticker: "MSFT", currentPrice: 350 },
      { ...quote, ticker: "NVDA", currentPrice: 450 },
    ]);

    await expect(
      service.findAllForUser(userId.toString(), { page: 2, limit: 2 }),
    ).resolves.toMatchObject({
      items: [{ ticker: "NVDA", quantity: 1 }],
      meta: {
        page: 2,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      summary: {
        positionsCount: 3,
        totalStocksCount: 5,
      },
    });

    expect(marketDataService.getQuotes).toHaveBeenCalledWith([
      "AAPL",
      "MSFT",
      "NVDA",
    ]);
  });

  it("returns portfolio allocation for all open positions with top 10 and others", async () => {
    const tickers = [
      "AAA",
      "BBB",
      "CCC",
      "DDD",
      "EEE",
      "FFF",
      "GGG",
      "HHH",
      "III",
      "JJJ",
      "KKK",
      "LLL",
    ];
    transactionsService.findAllForUser.mockResolvedValue(
      tickers.map((ticker, index) =>
        buildTransaction({
          id: `tx-${ticker}`,
          ticker,
          companyName: `${ticker} Inc.`,
          quantity: 1,
          price: 10,
          transactionDate: `2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
        }),
      ),
    );
    marketDataService.getQuotes.mockResolvedValue(
      tickers.map((ticker, index) => ({
        ...quote,
        ticker,
        currentPrice: (tickers.length - index) * 10,
      })),
    );

    await expect(service.getAllocationForUser(userId.toString())).resolves.toEqual({
      totalPortfolioValue: 780,
      allocations: [
        { ticker: "AAA", value: 120, percentage: (120 / 780) * 100 },
        { ticker: "BBB", value: 110, percentage: (110 / 780) * 100 },
        { ticker: "CCC", value: 100, percentage: (100 / 780) * 100 },
        { ticker: "DDD", value: 90, percentage: (90 / 780) * 100 },
        { ticker: "EEE", value: 80, percentage: (80 / 780) * 100 },
        { ticker: "FFF", value: 70, percentage: (70 / 780) * 100 },
        { ticker: "GGG", value: 60, percentage: (60 / 780) * 100 },
        { ticker: "HHH", value: 50, percentage: (50 / 780) * 100 },
        { ticker: "III", value: 40, percentage: (40 / 780) * 100 },
        { ticker: "JJJ", value: 30, percentage: (30 / 780) * 100 },
        { ticker: "Others", value: 30, percentage: (30 / 780) * 100 },
      ],
    });

    expect(transactionsService.findAllForUser).toHaveBeenCalledWith(
      userId.toString(),
    );
    expect(marketDataService.getQuotes).toHaveBeenCalledWith(tickers);
  });

  it("does not add others to allocation when there are 10 or fewer open positions", async () => {
    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({
        id: "tx-aapl",
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 1,
        price: 100,
      }),
      buildTransaction({
        id: "tx-msft",
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        quantity: 1,
        price: 100,
      }),
    ]);
    marketDataService.getQuotes.mockResolvedValue([
      { ...quote, ticker: "AAPL", currentPrice: 300 },
      { ...quote, ticker: "MSFT", currentPrice: 100 },
    ]);

    await expect(service.getAllocationForUser(userId.toString())).resolves.toEqual({
      totalPortfolioValue: 400,
      allocations: [
        { ticker: "AAPL", value: 300, percentage: 75 },
        { ticker: "MSFT", value: 100, percentage: 25 },
      ],
    });
  });

  it("returns an empty allocation when there are no open positions", async () => {
    transactionsService.findAllForUser.mockResolvedValue([]);

    await expect(service.getAllocationForUser(userId.toString())).resolves.toEqual({
      totalPortfolioValue: 0,
      allocations: [],
    });

    expect(marketDataService.getQuotes).not.toHaveBeenCalled();
  });

  it("hides fully sold positions from the portfolio", async () => {
    transactionsService.findAllForUser.mockResolvedValue([
      buildTransaction({
        id: "tx-2",
        type: "SELL",
        quantity: 2,
        transactionDate: "2026-05-02T00:00:00.000Z",
      }),
      buildTransaction({
        id: "tx-1",
        quantity: 2,
        price: 150,
        transactionDate: "2026-05-01T00:00:00.000Z",
      }),
    ]);

    await expect(service.findAllForUser(userId.toString())).resolves.toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      summary: {
        totalCostBasis: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
        totalStocksCount: 0,
        positionsCount: 0,
      },
    });

    expect(marketDataService.getQuotes).not.toHaveBeenCalled();
  });

  it("updates only an owned position", async () => {
    const findOneExec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(position);
    const exec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue({ ...position, quantity: 3 } as PortfolioPositionDocument);
    portfolioPositionModel.findOne.mockReturnValue({ exec: findOneExec });
    portfolioPositionModel.findOneAndUpdate.mockReturnValue({ exec });
    marketDataService.getQuote.mockResolvedValue(quote);

    await expect(
      service.updateForUser(userId.toString(), positionId.toString(), {
        quantity: 3,
      }),
    ).resolves.toMatchObject({
      quantity: 3,
      costBasis: 450,
      currentValue: 540,
      profitLoss: 90,
    });

    expect(portfolioPositionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: positionId, userId },
      { quantity: 3 },
      { new: true, runValidators: true },
    );
    expect(transactionsService.createForUser).toHaveBeenCalledWith(
      userId.toString(),
      {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        type: "UPDATE",
        quantity: 3,
        price: 150,
        currency: "USD",
        transactionDate: expect.any(String),
        notes: "Core holding",
      },
    );
  });

  it("rejects an update when the position is not owned by the user", async () => {
    const findOneExec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(null);
    portfolioPositionModel.findOne.mockReturnValue({ exec: findOneExec });

    await expect(
      service.updateForUser(otherUserId.toString(), positionId.toString(), {
        quantity: 3,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(portfolioPositionModel.findOne).toHaveBeenCalledWith({
      _id: positionId,
      userId: otherUserId,
    });
    expect(portfolioPositionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("deletes only an owned position", async () => {
    const findOneExec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(position);
    const exec = jest
      .fn<Promise<{ deletedCount: number }>, []>()
      .mockResolvedValue({ deletedCount: 1 });
    portfolioPositionModel.findOne.mockReturnValue({ exec: findOneExec });
    portfolioPositionModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(userId.toString(), positionId.toString()),
    ).resolves.toBeUndefined();

    expect(portfolioPositionModel.deleteOne).toHaveBeenCalledWith({
      _id: positionId,
      userId,
    });
    expect(transactionsService.createForUser).toHaveBeenCalledWith(
      userId.toString(),
      {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        type: "DELETE",
        quantity: 2,
        price: 150,
        currency: "USD",
        transactionDate: expect.any(String),
        notes: "Core holding",
      },
    );
  });

  it("rejects deletion when the position is not owned by the user", async () => {
    const exec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(null);
    portfolioPositionModel.findOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(otherUserId.toString(), positionId.toString()),
    ).rejects.toThrow(NotFoundException);

    expect(portfolioPositionModel.findOne).toHaveBeenCalledWith({
      _id: positionId,
      userId: otherUserId,
    });
    expect(portfolioPositionModel.deleteOne).not.toHaveBeenCalled();
    expect(transactionsService.createForUser).not.toHaveBeenCalled();
  });

  it("allows separate transactions for the same ticker", async () => {
    marketDataService.getQuote.mockResolvedValue(quote);
    portfolioPositionModel.create.mockResolvedValue(position);

    await expect(
      service.createForUser(userId.toString(), {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 2,
        averagePurchasePrice: 150,
        currency: "USD",
        purchaseDate: "2026-05-01",
      }),
    ).resolves.toMatchObject({ ticker: "AAPL" });

    expect(portfolioPositionModel.create).toHaveBeenCalled();
    expect(transactionsService.createForUser).toHaveBeenCalled();
  });

  it("rejects a future purchase date before creating a transaction", async () => {
    await expect(
      service.createForUser(userId.toString(), {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 2,
        averagePurchasePrice: 150,
        currency: "USD",
        purchaseDate: "2999-05-01T10:30:00.000Z",
      }),
    ).rejects.toThrow(BadRequestException);

    expect(marketDataService.getQuote).not.toHaveBeenCalled();
    expect(portfolioPositionModel.create).not.toHaveBeenCalled();
    expect(transactionsService.createForUser).not.toHaveBeenCalled();
  });

  it("rejects a future purchase date before updating a transaction", async () => {
    const exec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(position);
    portfolioPositionModel.findOne.mockReturnValue({ exec });
    marketDataService.getQuote.mockResolvedValue(quote);

    await expect(
      service.updateForUser(userId.toString(), positionId.toString(), {
        purchaseDate: "2999-05-01T10:30:00.000Z",
      }),
    ).rejects.toThrow(BadRequestException);

    expect(marketDataService.getQuote).not.toHaveBeenCalled();
    expect(portfolioPositionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(transactionsService.createForUser).not.toHaveBeenCalled();
  });

  it("does not create a position when quote loading fails", async () => {
    marketDataService.getQuote.mockRejectedValue(new Error("provider error"));

    await expect(
      service.createForUser(userId.toString(), {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        quantity: 2,
        averagePurchasePrice: 150,
        currency: "USD",
        purchaseDate: "2026-05-01",
      }),
    ).rejects.toThrow("provider error");

    expect(portfolioPositionModel.create).not.toHaveBeenCalled();
    expect(transactionsService.createForUser).not.toHaveBeenCalled();
  });

  it("does not update a position when quote loading fails", async () => {
    const exec = jest
      .fn<Promise<PortfolioPositionDocument | null>, []>()
      .mockResolvedValue(position);
    portfolioPositionModel.findOne.mockReturnValue({ exec });
    marketDataService.getQuote.mockRejectedValue(new Error("provider error"));

    await expect(
      service.updateForUser(userId.toString(), positionId.toString(), {
        quantity: 3,
      }),
    ).rejects.toThrow("provider error");

    expect(portfolioPositionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(transactionsService.createForUser).not.toHaveBeenCalled();
  });

  it("rejects invalid user and position ids", async () => {
    await expect(service.findAllForUser("invalid-user-id")).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.removeForUser(userId.toString(), "invalid-position-id"),
    ).rejects.toThrow(NotFoundException);
  });

  it("uses the authenticated user when loading transactions for portfolio pagination", async () => {
    transactionsService.findAllForUser.mockResolvedValue([]);

    await service.findAllForUser(otherUserId.toString(), { page: 1, limit: 10 });

    expect(transactionsService.findAllForUser).toHaveBeenCalledWith(
      otherUserId.toString(),
    );
  });
});
