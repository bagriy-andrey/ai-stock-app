import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  PortfolioDto,
  PortfolioPositionDto,
  PortfolioSummaryDto,
  StockQuote,
} from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import { MarketDataService } from "../market-data/market-data.service";
import type { CreatePortfolioPositionDto } from "./dto/create-portfolio-position.dto";
import type { UpdatePortfolioPositionDto } from "./dto/update-portfolio-position.dto";
import {
  PortfolioPosition,
  PortfolioPositionDocument,
} from "./schemas/portfolio-position.schema";

interface MongoIndex {
  key: Record<string, number>;
  name?: string;
  unique?: boolean;
}

interface MongoError {
  code?: number;
}

@Injectable()
export class PortfolioService implements OnModuleInit {
  constructor(
    @InjectModel(PortfolioPosition.name)
    private readonly portfolioPositionModel: Model<PortfolioPositionDocument>,
    private readonly marketDataService: MarketDataService,
  ) {}

  async onModuleInit(): Promise<void> {
    let indexes: MongoIndex[] = [];

    try {
      indexes =
        (await this.portfolioPositionModel.collection.indexes()) as MongoIndex[];
    } catch (error) {
      if (!this.isNamespaceNotFoundError(error)) {
        throw error;
      }
    }

    const legacyUniqueIndex = indexes.find(
      (index) =>
        index.unique === true &&
        index.key.userId === 1 &&
        index.key.ticker === 1 &&
        Object.keys(index.key).length === 2,
    ) as MongoIndex | undefined;

    if (legacyUniqueIndex?.name) {
      await this.portfolioPositionModel.collection.dropIndex(
        legacyUniqueIndex.name,
      );
    }

    await this.portfolioPositionModel.collection.createIndex(
      { userId: 1, ticker: 1 },
      { name: "portfolio_user_ticker" },
    );
  }

  async findAllForUser(userId: string): Promise<PortfolioDto> {
    const ownerId = this.toUserObjectId(userId);
    const positions = await this.portfolioPositionModel
      .find({ userId: ownerId })
      .sort({ createdAt: -1 })
      .exec();
    const valuedPositions = await this.addMarketValues(positions);

    return {
      positions: valuedPositions,
      summary: this.toSummary(valuedPositions),
    };
  }

  async createForUser(
    userId: string,
    input: CreatePortfolioPositionDto,
  ): Promise<PortfolioPositionDto> {
    const ownerId = this.toUserObjectId(userId);
    const ticker = this.normalizeTicker(input.ticker);
    const purchaseDate = this.toPurchaseDate(input.purchaseDate);
    const quote = await this.marketDataService.getQuote(ticker);

    const position = await this.portfolioPositionModel.create({
      userId: ownerId,
      ticker,
      companyName: input.companyName.trim(),
      quantity: input.quantity,
      averagePurchasePrice: input.averagePurchasePrice,
      currency: this.normalizeCurrency(input.currency),
      purchaseDate,
      notes: this.normalizeOptionalString(input.notes),
    });

    return this.toDto(position, quote);
  }

  async updateForUser(
    userId: string,
    positionId: string,
    input: UpdatePortfolioPositionDto,
  ): Promise<PortfolioPositionDto> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toPositionObjectId(positionId);
    const existingPosition = await this.portfolioPositionModel
      .findOne({ _id: id, userId: ownerId })
      .exec();

    if (!existingPosition) {
      throw new NotFoundException("Portfolio position not found");
    }

    const ticker =
      input.ticker === undefined
        ? existingPosition.ticker
        : this.normalizeTicker(input.ticker);
    const purchaseDate =
      input.purchaseDate === undefined
        ? undefined
        : this.toPurchaseDate(input.purchaseDate);
    const quote = await this.marketDataService.getQuote(ticker);
    const update = {
      ...(input.ticker === undefined
        ? {}
        : { ticker }),
      ...(input.companyName === undefined
        ? {}
        : { companyName: input.companyName.trim() }),
      ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
      ...(input.averagePurchasePrice === undefined
        ? {}
        : { averagePurchasePrice: input.averagePurchasePrice }),
      ...(input.currency === undefined
        ? {}
        : { currency: this.normalizeCurrency(input.currency) }),
      ...(purchaseDate === undefined ? {} : { purchaseDate }),
      ...(input.notes === undefined
        ? {}
        : { notes: this.normalizeOptionalString(input.notes) }),
    };

    const position = await this.portfolioPositionModel
      .findOneAndUpdate({ _id: id, userId: ownerId }, update, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!position) {
      throw new NotFoundException("Portfolio position not found");
    }

    return this.toDto(position, quote);
  }

  async removeForUser(userId: string, positionId: string): Promise<void> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toPositionObjectId(positionId);
    const result = await this.portfolioPositionModel
      .deleteOne({ _id: id, userId: ownerId })
      .exec();

    if (result.deletedCount !== 1) {
      throw new NotFoundException("Portfolio position not found");
    }
  }

  private async addMarketValues(
    positions: PortfolioPositionDocument[],
  ): Promise<PortfolioPositionDto[]> {
    const quotes = await this.marketDataService.getQuotes(
      [...new Set(positions.map((position) => position.ticker))],
    );
    const quotesByTicker = new Map(
      quotes.map((quote) => [quote.ticker, quote] as const),
    );

    return positions.map((position) =>
      this.toDto(position, this.getQuote(position, quotesByTicker)),
    );
  }

  private getQuote(
    position: PortfolioPositionDocument,
    quotesByTicker: Map<string, StockQuote>,
  ): StockQuote {
    const quote = quotesByTicker.get(position.ticker);

    if (!quote) {
      throw new Error(`Quote missing for ${position.ticker}`);
    }

    return quote;
  }

  private toDto(
    position: PortfolioPositionDocument,
    quote: StockQuote,
  ): PortfolioPositionDto {
    const costBasis = position.quantity * position.averagePurchasePrice;
    const currentValue = position.quantity * quote.currentPrice;
    const profitLoss = currentValue - costBasis;

    return {
      id: position._id.toString(),
      ticker: position.ticker,
      companyName: position.companyName,
      quantity: position.quantity,
      averagePurchasePrice: position.averagePurchasePrice,
      currentPrice: quote.currentPrice,
      costBasis,
      currentValue,
      profitLoss,
      profitLossPercent: (profitLoss / costBasis) * 100,
      currency: position.currency,
      purchaseDate: position.purchaseDate.toISOString(),
      notes: position.notes,
      createdAt: position.createdAt.toISOString(),
      updatedAt: position.updatedAt.toISOString(),
    };
  }

  private toSummary(positions: PortfolioPositionDto[]): PortfolioSummaryDto {
    const summary = positions.reduce(
      (currentSummary, position) => ({
        totalCostBasis: currentSummary.totalCostBasis + position.costBasis,
        totalCurrentValue:
          currentSummary.totalCurrentValue + position.currentValue,
        totalProfitLoss: currentSummary.totalProfitLoss + position.profitLoss,
      }),
      {
        totalCostBasis: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
      },
    );

    return {
      ...summary,
      totalProfitLossPercent:
        summary.totalCostBasis === 0
          ? 0
          : (summary.totalProfitLoss / summary.totalCostBasis) * 100,
      positionsCount: new Set(positions.map((position) => position.ticker)).size,
    };
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }

  private normalizeCurrency(currency: string): string {
    return currency.trim().toUpperCase();
  }

  private normalizeOptionalString(value: string | undefined): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
  }

  private toPurchaseDate(value: string): Date {
    const purchaseDate = new Date(value);

    if (
      Number.isNaN(purchaseDate.getTime()) ||
      purchaseDate.getTime() > Date.now()
    ) {
      throw new BadRequestException("Purchase date must not be in the future");
    }

    return purchaseDate;
  }

  private toUserObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    return new Types.ObjectId(userId);
  }

  private toPositionObjectId(positionId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(positionId)) {
      throw new NotFoundException("Portfolio position not found");
    }

    return new Types.ObjectId(positionId);
  }

  private isNamespaceNotFoundError(error: unknown): error is MongoError {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as MongoError).code === 26
    );
  }
}
