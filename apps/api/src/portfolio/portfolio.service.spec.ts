import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { StockQuote } from "@ai-stock-advisor/shared";
import { Types } from "mongoose";
import type { MarketDataService } from "../market-data/market-data.service";
import { PortfolioService } from "./portfolio.service";
import type { PortfolioPositionDocument } from "./schemas/portfolio-position.schema";

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
  const service = new PortfolioService(
    portfolioPositionModel as never,
    marketDataService,
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
      id: positionId.toString(),
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
  });

  it("returns a valued portfolio summary across separate transactions", async () => {
    const secondPosition = {
      ...position,
      _id: new Types.ObjectId("665daec06c456275631b7af4"),
      ticker: "AAPL",
      companyName: "Apple Inc.",
      quantity: 1,
      averagePurchasePrice: 120,
      purchaseDate: new Date("2026-05-02T10:30:00.000Z"),
    } as unknown as PortfolioPositionDocument;
    const exec = jest
      .fn<Promise<PortfolioPositionDocument[]>, []>()
      .mockResolvedValue([position, secondPosition]);
    const sort = jest.fn().mockReturnValue({ exec });
    portfolioPositionModel.find.mockReturnValue({ sort });
    marketDataService.getQuotes.mockResolvedValue([quote]);

    await expect(service.findAllForUser(userId.toString())).resolves.toEqual({
      positions: [
        expect.objectContaining({
          ticker: "AAPL",
          costBasis: 300,
          currentValue: 360,
          profitLoss: 60,
          profitLossPercent: 20,
        }),
        expect.objectContaining({
          ticker: "AAPL",
          costBasis: 120,
          currentValue: 180,
          profitLoss: 60,
          profitLossPercent: 50,
        }),
      ],
      summary: {
        totalCostBasis: 420,
        totalCurrentValue: 540,
        totalProfitLoss: 120,
        totalProfitLossPercent: (120 / 420) * 100,
        positionsCount: 1,
      },
    });

    expect(portfolioPositionModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(marketDataService.getQuotes).toHaveBeenCalledWith(["AAPL"]);
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
    const exec = jest
      .fn<Promise<{ deletedCount: number }>, []>()
      .mockResolvedValue({ deletedCount: 1 });
    portfolioPositionModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(userId.toString(), positionId.toString()),
    ).resolves.toBeUndefined();

    expect(portfolioPositionModel.deleteOne).toHaveBeenCalledWith({
      _id: positionId,
      userId,
    });
  });

  it("rejects deletion when the position is not owned by the user", async () => {
    const exec = jest
      .fn<Promise<{ deletedCount: number }>, []>()
      .mockResolvedValue({ deletedCount: 0 });
    portfolioPositionModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(otherUserId.toString(), positionId.toString()),
    ).rejects.toThrow(NotFoundException);
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
  });

  it("rejects invalid user and position ids", async () => {
    await expect(service.findAllForUser("invalid-user-id")).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.removeForUser(userId.toString(), "invalid-position-id"),
    ).rejects.toThrow(NotFoundException);
  });
});
