import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import type { PortfolioTransactionDocument } from "./schemas/portfolio-transaction.schema";
import { TransactionsService } from "./transactions.service";

describe("TransactionsService", () => {
  const portfolioTransactionModel = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const service = new TransactionsService(portfolioTransactionModel as never);
  const userId = new Types.ObjectId("665daec06c456275631b7af1");
  const otherUserId = new Types.ObjectId("665daec06c456275631b7af2");
  const transactionId = new Types.ObjectId("665daec06c456275631b7af3");
  const now = new Date("2026-06-02T09:00:00.000Z");
  const transaction = {
    _id: transactionId,
    userId,
    ticker: "AAPL",
    companyName: "Apple Inc.",
    type: "BUY",
    quantity: 2,
    price: 150,
    currency: "USD",
    transactionDate: new Date("2026-05-01T10:30:00.000Z"),
    notes: "Core holding",
    createdAt: now,
    updatedAt: now,
  } as unknown as PortfolioTransactionDocument;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockPaginatedFind(
    transactions: PortfolioTransactionDocument[],
    totalItems = transactions.length,
  ) {
    const countExec = jest.fn().mockResolvedValue(totalItems);
    const findExec = jest.fn().mockResolvedValue(transactions);
    const limit = jest.fn().mockReturnValue({ exec: findExec });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    portfolioTransactionModel.countDocuments.mockReturnValue({ exec: countExec });
    portfolioTransactionModel.find.mockReturnValue({ sort });

    return { countExec, findExec, limit, skip, sort };
  }

  it("creates a normalized transaction for a user", async () => {
    portfolioTransactionModel.create.mockResolvedValue(transaction);

    await expect(
      service.createForUser(userId.toString(), {
        ticker: " aapl ",
        companyName: " Apple Inc. ",
        type: "BUY",
        quantity: 2,
        price: 150,
        currency: " usd ",
        transactionDate: "2026-05-01T10:30:00.000Z",
        notes: " Core holding ",
      }),
    ).resolves.toEqual({
      id: transactionId.toString(),
      userId: userId.toString(),
      ticker: "AAPL",
      companyName: "Apple Inc.",
      type: "BUY",
      quantity: 2,
      price: 150,
      currency: "USD",
      transactionDate: "2026-05-01T10:30:00.000Z",
      notes: "Core holding",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    expect(portfolioTransactionModel.create).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
      companyName: "Apple Inc.",
      type: "BUY",
      quantity: 2,
      price: 150,
      currency: "USD",
      transactionDate: new Date("2026-05-01T10:30:00.000Z"),
      notes: "Core holding",
    });
  });

  it("lists transactions for a user", async () => {
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument[]>, []>()
      .mockResolvedValue([transaction]);
    const sort = jest.fn().mockReturnValue({ exec });
    portfolioTransactionModel.find.mockReturnValue({ sort });

    await expect(service.findAllForUser(userId.toString())).resolves.toEqual([
      expect.objectContaining({
        id: transactionId.toString(),
        userId: userId.toString(),
        ticker: "AAPL",
      }),
    ]);

    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ transactionDate: -1, createdAt: -1 });
  });

  it("returns default paginated transactions for a user", async () => {
    const { limit, skip, sort } = mockPaginatedFind([transaction], 12);

    await expect(
      service.findPageForUser(userId.toString()),
    ).resolves.toMatchObject({
      items: [
        {
          id: transactionId.toString(),
          userId: userId.toString(),
          ticker: "AAPL",
        },
      ],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 12,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });

    expect(portfolioTransactionModel.countDocuments).toHaveBeenCalledWith({
      userId,
    });
    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ transactionDate: -1, createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(10);
  });

  it("returns a custom transaction page and limit", async () => {
    const { limit, skip } = mockPaginatedFind([transaction], 25);

    await expect(
      service.findPageForUser(userId.toString(), { page: 3, limit: 5 }),
    ).resolves.toMatchObject({
      meta: {
        page: 3,
        limit: 5,
        totalItems: 25,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });

    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(5);
  });

  it("filters transactions by ticker", async () => {
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument[]>, []>()
      .mockResolvedValue([transaction]);
    const sort = jest.fn().mockReturnValue({ exec });
    portfolioTransactionModel.find.mockReturnValue({ sort });

    await service.findAllForUser(userId.toString(), { ticker: " aapl " });

    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
    });
  });

  it("filters transactions by type", async () => {
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument[]>, []>()
      .mockResolvedValue([transaction]);
    const sort = jest.fn().mockReturnValue({ exec });
    portfolioTransactionModel.find.mockReturnValue({ sort });

    await service.findAllForUser(userId.toString(), { type: "BUY" });

    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({
      userId,
      type: "BUY",
    });
  });

  it("paginates transactions with a ticker filter", async () => {
    mockPaginatedFind([transaction], 11);

    await expect(
      service.findPageForUser(userId.toString(), {
        ticker: " aapl ",
        page: 1,
        limit: 10,
      }),
    ).resolves.toMatchObject({
      meta: {
        totalItems: 11,
        totalPages: 2,
        hasNextPage: true,
      },
    });

    expect(portfolioTransactionModel.countDocuments).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
    });
    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
    });
  });

  it("filters transactions by date range", async () => {
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument[]>, []>()
      .mockResolvedValue([transaction]);
    const sort = jest.fn().mockReturnValue({ exec });
    portfolioTransactionModel.find.mockReturnValue({ sort });

    await service.findAllForUser(userId.toString(), {
      fromDate: "2026-05-01",
      toDate: "2026-05-31",
    });

    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({
      userId,
      transactionDate: {
        $gte: new Date("2026-05-01"),
        $lte: new Date("2026-05-31T23:59:59.999Z"),
      },
    });
  });

  it("paginates transactions with date filters", async () => {
    const { limit, skip } = mockPaginatedFind([transaction], 7);

    await expect(
      service.findPageForUser(userId.toString(), {
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
        page: 2,
        limit: 3,
      }),
    ).resolves.toMatchObject({
      meta: {
        page: 2,
        limit: 3,
        totalItems: 7,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });

    const expectedQuery = {
      userId,
      transactionDate: {
        $gte: new Date("2026-05-01"),
        $lte: new Date("2026-05-31T23:59:59.999Z"),
      },
    };
    expect(portfolioTransactionModel.countDocuments).toHaveBeenCalledWith(
      expectedQuery,
    );
    expect(portfolioTransactionModel.find).toHaveBeenCalledWith(expectedQuery);
    expect(skip).toHaveBeenCalledWith(3);
    expect(limit).toHaveBeenCalledWith(3);
  });

  it("does not leak transactions between users in paginated results", async () => {
    mockPaginatedFind([], 0);

    await expect(
      service.findPageForUser(otherUserId.toString(), { page: 1, limit: 10 }),
    ).resolves.toEqual({
      items: [],
      meta: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    expect(portfolioTransactionModel.countDocuments).toHaveBeenCalledWith({
      userId: otherUserId,
    });
    expect(portfolioTransactionModel.find).toHaveBeenCalledWith({
      userId: otherUserId,
    });
  });

  it("returns a single owned transaction", async () => {
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument | null>, []>()
      .mockResolvedValue(transaction);
    portfolioTransactionModel.findOne.mockReturnValue({ exec });

    await expect(
      service.findOneForUser(userId.toString(), transactionId.toString()),
    ).resolves.toMatchObject({ id: transactionId.toString(), ticker: "AAPL" });

    expect(portfolioTransactionModel.findOne).toHaveBeenCalledWith({
      _id: transactionId,
      userId,
    });
  });

  it("updates only an owned transaction", async () => {
    const updatedTransaction = {
      ...transaction,
      type: "SELL",
      quantity: 1,
      price: 175,
    } as PortfolioTransactionDocument;
    const exec = jest
      .fn<Promise<PortfolioTransactionDocument | null>, []>()
      .mockResolvedValue(updatedTransaction);
    portfolioTransactionModel.findOneAndUpdate.mockReturnValue({ exec });

    await expect(
      service.updateForUser(userId.toString(), transactionId.toString(), {
        type: "SELL",
        quantity: 1,
        price: 175,
      }),
    ).resolves.toMatchObject({ type: "SELL", quantity: 1, price: 175 });

    expect(portfolioTransactionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: transactionId, userId },
      { type: "SELL", quantity: 1, price: 175 },
      { new: true, runValidators: true },
    );
  });

  it("deletes only an owned transaction", async () => {
    const exec = jest
      .fn<Promise<{ deletedCount: number }>, []>()
      .mockResolvedValue({ deletedCount: 1 });
    portfolioTransactionModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(userId.toString(), transactionId.toString()),
    ).resolves.toBeUndefined();

    expect(portfolioTransactionModel.deleteOne).toHaveBeenCalledWith({
      _id: transactionId,
      userId,
    });
  });

  it("isolates transaction data by user", async () => {
    const findOneExec = jest
      .fn<Promise<PortfolioTransactionDocument | null>, []>()
      .mockResolvedValue(null);
    const updateExec = jest
      .fn<Promise<PortfolioTransactionDocument | null>, []>()
      .mockResolvedValue(null);
    const deleteExec = jest
      .fn<Promise<{ deletedCount: number }>, []>()
      .mockResolvedValue({ deletedCount: 0 });
    portfolioTransactionModel.findOne.mockReturnValue({ exec: findOneExec });
    portfolioTransactionModel.findOneAndUpdate.mockReturnValue({ exec: updateExec });
    portfolioTransactionModel.deleteOne.mockReturnValue({ exec: deleteExec });

    await expect(
      service.findOneForUser(otherUserId.toString(), transactionId.toString()),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.updateForUser(otherUserId.toString(), transactionId.toString(), {
        quantity: 3,
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.removeForUser(otherUserId.toString(), transactionId.toString()),
    ).rejects.toThrow(NotFoundException);

    expect(portfolioTransactionModel.findOne).toHaveBeenCalledWith({
      _id: transactionId,
      userId: otherUserId,
    });
    expect(portfolioTransactionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: transactionId, userId: otherUserId },
      { quantity: 3 },
      { new: true, runValidators: true },
    );
    expect(portfolioTransactionModel.deleteOne).toHaveBeenCalledWith({
      _id: transactionId,
      userId: otherUserId,
    });
  });

  it("rejects invalid ids and invalid dates", async () => {
    await expect(service.findAllForUser("invalid-user-id")).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.findOneForUser(userId.toString(), "invalid-transaction-id"),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.findAllForUser(userId.toString(), { fromDate: "not-a-date" }),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    [{ page: 0 }, "page"],
    [{ page: 1.5 }, "page"],
    [{ limit: 0 }, "limit"],
    [{ limit: 101 }, "limit"],
  ])("rejects invalid pagination option %s", async (pagination, _field) => {
    await expect(
      service.findPageForUser(userId.toString(), pagination),
    ).rejects.toThrow(BadRequestException);
  });
});
