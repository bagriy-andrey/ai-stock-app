import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import type { PortfolioTransactionDocument } from "./schemas/portfolio-transaction.schema";
import { TransactionsService } from "./transactions.service";

describe("TransactionsService", () => {
  const portfolioTransactionModel = {
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
});
