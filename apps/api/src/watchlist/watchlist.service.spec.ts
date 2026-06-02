import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import type { WatchlistItemDocument } from "./schemas/watchlist-item.schema";
import { WatchlistService } from "./watchlist.service";

describe("WatchlistService", () => {
  const watchlistItemModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };
  const service = new WatchlistService(watchlistItemModel as never);
  const userId = new Types.ObjectId("665daec06c456275631b7af1");
  const otherUserId = new Types.ObjectId("665daec06c456275631b7af2");
  const itemId = new Types.ObjectId("665daec06c456275631b7af3");
  const now = new Date("2026-06-02T09:00:00.000Z");
  const watchlistItem = {
    _id: itemId,
    userId,
    ticker: "AAPL",
    companyName: "Apple Inc.",
    createdAt: now,
    updatedAt: now,
  } as unknown as WatchlistItemDocument;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns watchlist items for a user", async () => {
    const exec = jest.fn<Promise<WatchlistItemDocument[]>, []>().mockResolvedValue([
      watchlistItem,
    ]);
    const sort = jest.fn().mockReturnValue({ exec });
    watchlistItemModel.find.mockReturnValue({ sort });

    await expect(service.findAllForUser(userId.toString())).resolves.toEqual([
      {
        id: itemId.toString(),
        userId: userId.toString(),
        ticker: "AAPL",
        companyName: "Apple Inc.",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ]);

    expect(watchlistItemModel.find).toHaveBeenCalledWith({ userId });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it("adds a normalized ticker for a user", async () => {
    const findOneExec = jest
      .fn<Promise<WatchlistItemDocument | null>, []>()
      .mockResolvedValue(null);
    watchlistItemModel.findOne.mockReturnValue({ exec: findOneExec });
    watchlistItemModel.create.mockResolvedValue(watchlistItem);

    await expect(
      service.addForUser(userId.toString(), {
        ticker: " aapl ",
        companyName: " Apple Inc. ",
      }),
    ).resolves.toMatchObject({
      id: itemId.toString(),
      userId: userId.toString(),
      ticker: "AAPL",
      companyName: "Apple Inc.",
    });

    expect(watchlistItemModel.findOne).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
    });
    expect(watchlistItemModel.create).toHaveBeenCalledWith({
      userId,
      ticker: "AAPL",
      companyName: "Apple Inc.",
    });
  });

  it("rejects duplicate tickers for the same user", async () => {
    const exec = jest
      .fn<Promise<WatchlistItemDocument | null>, []>()
      .mockResolvedValue(watchlistItem);
    watchlistItemModel.findOne.mockReturnValue({ exec });

    await expect(
      service.addForUser(userId.toString(), { ticker: "AAPL" }),
    ).rejects.toThrow(ConflictException);

    expect(watchlistItemModel.create).not.toHaveBeenCalled();
  });

  it("maps duplicate key errors to conflicts", async () => {
    const exec = jest
      .fn<Promise<WatchlistItemDocument | null>, []>()
      .mockResolvedValue(null);
    watchlistItemModel.findOne.mockReturnValue({ exec });
    watchlistItemModel.create.mockRejectedValue(
      Object.assign(new Error("duplicate key"), { code: 11000 }),
    );

    await expect(
      service.addForUser(userId.toString(), { ticker: "AAPL" }),
    ).rejects.toThrow(ConflictException);
  });

  it("removes only items owned by the user", async () => {
    const exec = jest.fn<Promise<{ deletedCount: number }>, []>().mockResolvedValue({
      deletedCount: 1,
    });
    watchlistItemModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(userId.toString(), itemId.toString()),
    ).resolves.toBeUndefined();

    expect(watchlistItemModel.deleteOne).toHaveBeenCalledWith({
      _id: itemId,
      userId,
    });
  });

  it("rejects deletion when the item is not owned by the user", async () => {
    const exec = jest.fn<Promise<{ deletedCount: number }>, []>().mockResolvedValue({
      deletedCount: 0,
    });
    watchlistItemModel.deleteOne.mockReturnValue({ exec });

    await expect(
      service.removeForUser(otherUserId.toString(), itemId.toString()),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects invalid ids", async () => {
    await expect(service.findAllForUser("invalid-user-id")).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.removeForUser(userId.toString(), "invalid-item-id"),
    ).rejects.toThrow(NotFoundException);
  });
});
