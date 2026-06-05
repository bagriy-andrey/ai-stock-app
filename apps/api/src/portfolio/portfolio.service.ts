import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  PortfolioAllocationDto,
  PortfolioDto,
  PortfolioPositionDto,
  PortfolioSummaryDto,
  PortfolioTransactionDto,
  StockQuote,
} from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import {
  paginateItems,
  type PaginationOptions,
} from "../common/pagination";
import { MarketDataService } from "../market-data/market-data.service";
import { TransactionsService } from "../transactions/transactions.service";
import type { CreatePortfolioPositionDto } from "./dto/create-portfolio-position.dto";
import {
  purchaseNumberMax,
  purchaseNumberMin,
} from "./dto/portfolio-position-validation";
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

interface PositionAccumulator {
  ticker: string;
  companyName: string;
  buyQuantity: number;
  buyCostBasis: number;
  sellQuantity: number;
  currency: string;
}

const allocationTopPositionsLimit = 10;

@Injectable()
export class PortfolioService implements OnModuleInit {
  constructor(
    @InjectModel(PortfolioPosition.name)
    private readonly portfolioPositionModel: Model<PortfolioPositionDocument>,
    private readonly marketDataService: MarketDataService,
    private readonly transactionsService: TransactionsService,
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

  async findAllForUser(
    userId: string,
    paginationOptions: PaginationOptions = {},
  ): Promise<PortfolioDto> {
    const valuedPositions = await this.getValuedOpenPositionsForUser(userId);
    const paginatedPositions = paginateItems(valuedPositions, paginationOptions);

    return {
      items: paginatedPositions.items,
      meta: paginatedPositions.meta,
      summary: this.toSummary(valuedPositions),
    };
  }

  async getAllocationForUser(userId: string): Promise<PortfolioAllocationDto> {
    const valuedPositions = await this.getValuedOpenPositionsForUser(userId);
    const sortedPositions = [...valuedPositions].sort(
      (left, right) => right.currentValue - left.currentValue,
    );
    const totalPortfolioValue = sortedPositions.reduce(
      (totalValue, position) => totalValue + position.currentValue,
      0,
    );

    if (totalPortfolioValue <= 0) {
      return {
        totalPortfolioValue,
        allocations: [],
      };
    }

    const topPositions = sortedPositions.slice(0, allocationTopPositionsLimit);
    const remainingPositions = sortedPositions.slice(allocationTopPositionsLimit);
    const allocations = topPositions.map((position) =>
      this.toAllocationItem(position.ticker, position.currentValue, totalPortfolioValue),
    );

    if (remainingPositions.length > 0) {
      const otherPositionsValue = remainingPositions.reduce(
        (totalValue, position) => totalValue + position.currentValue,
        0,
      );

      if (otherPositionsValue > 0) {
        allocations.push(
          this.toAllocationItem(
            "Others",
            otherPositionsValue,
            totalPortfolioValue,
          ),
        );
      }
    }

    return {
      totalPortfolioValue,
      allocations,
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
    const profile = await this.marketDataService
      .getCompanyProfile(ticker)
      .catch(() => null);
    const companyName = profile?.name?.trim() || input.companyName.trim();

    const position = await this.portfolioPositionModel.create({
      userId: ownerId,
      ticker,
      companyName,
      quantity: this.validatePurchaseNumber(input.quantity, "quantity"),
      averagePurchasePrice: this.validatePurchaseNumber(
        input.averagePurchasePrice,
        "averagePurchasePrice",
      ),
      currency: this.normalizeCurrency(input.currency),
      purchaseDate,
      notes: this.normalizeOptionalString(input.notes),
    });

    await this.transactionsService.createForUser(userId, {
      ticker: position.ticker,
      companyName: position.companyName,
      type: "BUY",
      quantity: position.quantity,
      price: position.averagePurchasePrice,
      currency: position.currency,
      transactionDate: position.purchaseDate.toISOString(),
      notes: position.notes,
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
    const profile =
      input.ticker === undefined
        ? null
        : await this.marketDataService.getCompanyProfile(ticker).catch(() => null);
    const update = {
      ...(input.ticker === undefined
        ? {}
        : { ticker }),
      ...(input.companyName === undefined
        ? {}
        : { companyName: profile?.name?.trim() || input.companyName.trim() }),
      ...(input.quantity === undefined
        ? {}
        : { quantity: this.validatePurchaseNumber(input.quantity, "quantity") }),
      ...(input.averagePurchasePrice === undefined
        ? {}
        : {
            averagePurchasePrice: this.validatePurchaseNumber(
              input.averagePurchasePrice,
              "averagePurchasePrice",
            ),
          }),
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

    await this.transactionsService.createForUser(userId, {
      ticker: position.ticker,
      companyName: position.companyName,
      type: "UPDATE",
      quantity: position.quantity,
      price: position.averagePurchasePrice,
      currency: position.currency,
      transactionDate: new Date().toISOString(),
      notes: position.notes,
    });

    return this.toDto(position, quote);
  }

  async removeForUser(userId: string, positionId: string): Promise<void> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toPositionObjectId(positionId);
    const existingPosition = await this.portfolioPositionModel
      .findOne({ _id: id, userId: ownerId })
      .exec();

    if (!existingPosition) {
      throw new NotFoundException("Portfolio position not found");
    }

    const result = await this.portfolioPositionModel
      .deleteOne({ _id: id, userId: ownerId })
      .exec();

    if (result.deletedCount !== 1) {
      throw new NotFoundException("Portfolio position not found");
    }

    await this.transactionsService.createForUser(userId, {
      ticker: existingPosition.ticker,
      companyName: existingPosition.companyName,
      type: "DELETE",
      quantity: existingPosition.quantity,
      price: existingPosition.averagePurchasePrice,
      currency: existingPosition.currency,
      transactionDate: new Date().toISOString(),
      notes: existingPosition.notes,
    });
  }

  private async getValuedOpenPositionsForUser(
    userId: string,
  ): Promise<PortfolioPositionDto[]> {
    this.toUserObjectId(userId);
    const transactions = await this.transactionsService.findAllForUser(userId);
    const openPositions = this.aggregateTransactions(transactions);

    return this.addMarketValues(openPositions);
  }

  private async addMarketValues(
    positions: PortfolioPositionDto[],
  ): Promise<PortfolioPositionDto[]> {
    if (positions.length === 0) {
      return [];
    }

    const quotes = await this.marketDataService.getQuotes(
      [...new Set(positions.map((position) => position.ticker))],
    );
    const quotesByTicker = new Map(
      quotes.map((quote) => [this.normalizeTicker(quote.ticker), quote] as const),
    );

    return positions.map((position) =>
      this.withMarketValue(position, this.getQuote(position, quotesByTicker)),
    );
  }

  private getQuote(
    position: PortfolioPositionDto,
    quotesByTicker: Map<string, StockQuote>,
  ): StockQuote {
    const quote = quotesByTicker.get(position.ticker);

    if (!quote) {
      throw new Error(`Quote missing for ${position.ticker}`);
    }

    return quote;
  }

  private aggregateTransactions(
    transactions: PortfolioTransactionDto[],
  ): PortfolioPositionDto[] {
    const positionsByTicker = new Map<string, PositionAccumulator>();
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

      const ticker = this.normalizeTicker(transaction.ticker);
      const position =
        positionsByTicker.get(ticker) ??
        ({
          ticker,
          companyName: transaction.companyName,
          buyQuantity: 0,
          buyCostBasis: 0,
          sellQuantity: 0,
          currency: this.normalizeCurrency(transaction.currency),
        } satisfies PositionAccumulator);

      position.companyName = transaction.companyName;
      position.currency = this.normalizeCurrency(transaction.currency);

      if (transaction.type === "BUY") {
        position.buyQuantity += transaction.quantity;
        position.buyCostBasis += transaction.quantity * transaction.price;
      } else {
        position.sellQuantity += transaction.quantity;
      }

      positionsByTicker.set(ticker, position);
    }

    return [...positionsByTicker.values()]
      .map((position) => {
        const quantity = position.buyQuantity - position.sellQuantity;
        const averagePurchasePrice =
          position.buyQuantity === 0
            ? 0
            : position.buyCostBasis / position.buyQuantity;
        const costBasis = quantity * averagePurchasePrice;

        return {
          ticker: position.ticker,
          companyName: position.companyName,
          quantity,
          averagePurchasePrice,
          currentPrice: 0,
          costBasis,
          currentValue: 0,
          profitLoss: 0,
          profitLossPercent: 0,
          currency: position.currency,
        };
      })
      .filter((position) => position.quantity > 0)
      .sort((left, right) => left.ticker.localeCompare(right.ticker));
  }

  private withMarketValue(
    position: PortfolioPositionDto,
    quote: StockQuote,
  ): PortfolioPositionDto {
    const currentValue = position.quantity * quote.currentPrice;
    const profitLoss = currentValue - position.costBasis;

    return {
      ...position,
      currentPrice: quote.currentPrice,
      currentValue,
      profitLoss,
      profitLossPercent:
        position.costBasis === 0
          ? 0
          : (profitLoss / position.costBasis) * 100,
      currency: quote.currency
        ? this.normalizeCurrency(quote.currency)
        : position.currency,
    };
  }

  private toDto(
    position: PortfolioPositionDocument,
    quote: StockQuote,
  ): PortfolioPositionDto {
    const costBasis = position.quantity * position.averagePurchasePrice;
    const currentValue = position.quantity * quote.currentPrice;
    const profitLoss = currentValue - costBasis;

    return {
      ticker: position.ticker,
      companyName: position.companyName,
      quantity: position.quantity,
      averagePurchasePrice: position.averagePurchasePrice,
      currentPrice: quote.currentPrice,
      costBasis,
      currentValue,
      profitLoss,
      profitLossPercent: (profitLoss / costBasis) * 100,
      currency: quote.currency
        ? this.normalizeCurrency(quote.currency)
        : position.currency,
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
      totalStocksCount: positions.reduce(
        (totalQuantity, position) => totalQuantity + position.quantity,
        0,
      ),
      positionsCount: positions.length,
    };
  }

  private toAllocationItem(
    ticker: string,
    value: number,
    totalPortfolioValue: number,
  ): PortfolioAllocationDto["allocations"][number] {
    return {
      ticker,
      value,
      percentage: (value / totalPortfolioValue) * 100,
    };
  }

  private normalizeTicker(ticker: string): string {
    return ticker.trim().toUpperCase();
  }

  private normalizeCurrency(currency: string): string {
    const normalizedCurrency = currency.trim().toUpperCase();

    if (normalizedCurrency !== "USD") {
      throw new BadRequestException("currency must be a supported currency");
    }

    return normalizedCurrency;
  }

  private normalizeOptionalString(value: string | undefined): string | undefined {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : undefined;
  }

  private validatePurchaseNumber(value: number, fieldName: string): number {
    if (
      !Number.isFinite(value) ||
      value < purchaseNumberMin ||
      value > purchaseNumberMax
    ) {
      throw new BadRequestException(
        `${fieldName} must be between ${purchaseNumberMin} and ${purchaseNumberMax}`,
      );
    }

    return value;
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
