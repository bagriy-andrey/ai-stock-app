import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { WatchlistItemDto } from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import type { CreateWatchlistItemDto } from "./dto/create-watchlist-item.dto";
import {
  WatchlistItem,
  WatchlistItemDocument,
} from "./schemas/watchlist-item.schema";

interface MongoDuplicateKeyError extends Error {
  code?: number;
}

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(WatchlistItem.name)
    private readonly watchlistItemModel: Model<WatchlistItemDocument>,
  ) {}

  async findAllForUser(userId: string): Promise<WatchlistItemDto[]> {
    const ownerId = this.toUserObjectId(userId);
    const items = await this.watchlistItemModel
      .find({ userId: ownerId })
      .sort({ createdAt: -1 })
      .exec();

    return items.map((item) => this.toDto(item));
  }

  async addForUser(
    userId: string,
    input: CreateWatchlistItemDto,
  ): Promise<WatchlistItemDto> {
    const ownerId = this.toUserObjectId(userId);
    const ticker = this.normalizeTicker(input.ticker);
    const companyName = input.companyName?.trim() || undefined;
    const existingItem = await this.watchlistItemModel
      .findOne({ userId: ownerId, ticker })
      .exec();

    if (existingItem) {
      throw new ConflictException("Ticker already exists in watchlist");
    }

    try {
      const item = await this.watchlistItemModel.create({
        userId: ownerId,
        ticker,
        companyName,
      });

      return this.toDto(item);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException("Ticker already exists in watchlist");
      }

      throw error;
    }
  }

  async removeForUser(userId: string, itemId: string): Promise<void> {
    const ownerId = this.toUserObjectId(userId);

    if (!Types.ObjectId.isValid(itemId)) {
      throw new NotFoundException("Watchlist item not found");
    }

    const result = await this.watchlistItemModel
      .deleteOne({ _id: new Types.ObjectId(itemId), userId: ownerId })
      .exec();

    if (result.deletedCount !== 1) {
      throw new NotFoundException("Watchlist item not found");
    }
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }

  private toUserObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    return new Types.ObjectId(userId);
  }

  private toDto(item: WatchlistItemDocument): WatchlistItemDto {
    return {
      id: item._id.toString(),
      userId: item.userId.toString(),
      ticker: item.ticker,
      companyName: item.companyName,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private isDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as MongoDuplicateKeyError).code === 11000
    );
  }
}
