import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  PortfolioTransactionDto,
  PortfolioTransactionType,
} from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import type { CreatePortfolioTransactionDto } from "./dto/create-portfolio-transaction.dto";
import type { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import type { UpdatePortfolioTransactionDto } from "./dto/update-portfolio-transaction.dto";
import {
  PortfolioTransaction,
  PortfolioTransactionDocument,
} from "./schemas/portfolio-transaction.schema";

export interface CreatePortfolioTransactionInput {
  ticker: string;
  companyName: string;
  type: PortfolioTransactionType;
  quantity: number;
  price: number;
  currency: string;
  transactionDate: string;
  notes?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(PortfolioTransaction.name)
    private readonly portfolioTransactionModel: Model<PortfolioTransactionDocument>,
  ) {}

  async findAllForUser(
    userId: string,
    filters: ListTransactionsQueryDto = {},
  ): Promise<PortfolioTransactionDto[]> {
    const ownerId = this.toUserObjectId(userId);
    const query = this.buildFindQuery(ownerId, filters);
    const transactions = await this.portfolioTransactionModel
      .find(query)
      .sort({ transactionDate: -1, createdAt: -1 })
      .exec();

    return transactions.map((transaction) => this.toDto(transaction));
  }

  async findOneForUser(
    userId: string,
    transactionId: string,
  ): Promise<PortfolioTransactionDto> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toTransactionObjectId(transactionId);
    const transaction = await this.portfolioTransactionModel
      .findOne({ _id: id, userId: ownerId })
      .exec();

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return this.toDto(transaction);
  }

  async createForUser(
    userId: string,
    input: CreatePortfolioTransactionDto | CreatePortfolioTransactionInput,
  ): Promise<PortfolioTransactionDto> {
    const ownerId = this.toUserObjectId(userId);
    const transaction = await this.portfolioTransactionModel.create({
      userId: ownerId,
      ticker: this.normalizeTicker(input.ticker),
      companyName: input.companyName.trim(),
      type: input.type,
      quantity: input.quantity,
      price: input.price,
      currency: this.normalizeCurrency(input.currency),
      transactionDate: this.toTransactionDate(input.transactionDate),
      notes: this.normalizeOptionalString(input.notes),
    });

    return this.toDto(transaction);
  }

  async updateForUser(
    userId: string,
    transactionId: string,
    input: UpdatePortfolioTransactionDto,
  ): Promise<PortfolioTransactionDto> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toTransactionObjectId(transactionId);
    const transactionDate =
      input.transactionDate === undefined
        ? undefined
        : this.toTransactionDate(input.transactionDate);
    const update = {
      ...(input.ticker === undefined
        ? {}
        : { ticker: this.normalizeTicker(input.ticker) }),
      ...(input.companyName === undefined
        ? {}
        : { companyName: input.companyName.trim() }),
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
      ...(input.price === undefined ? {} : { price: input.price }),
      ...(input.currency === undefined
        ? {}
        : { currency: this.normalizeCurrency(input.currency) }),
      ...(transactionDate === undefined ? {} : { transactionDate }),
      ...(input.notes === undefined
        ? {}
        : { notes: this.normalizeOptionalString(input.notes) }),
    };

    const transaction = await this.portfolioTransactionModel
      .findOneAndUpdate({ _id: id, userId: ownerId }, update, {
        new: true,
        runValidators: true,
      })
      .exec();

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return this.toDto(transaction);
  }

  async removeForUser(userId: string, transactionId: string): Promise<void> {
    const ownerId = this.toUserObjectId(userId);
    const id = this.toTransactionObjectId(transactionId);
    const result = await this.portfolioTransactionModel
      .deleteOne({ _id: id, userId: ownerId })
      .exec();

    if (result.deletedCount !== 1) {
      throw new NotFoundException("Transaction not found");
    }
  }

  private buildFindQuery(
    userId: Types.ObjectId,
    filters: ListTransactionsQueryDto,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = { userId };

    if (filters.ticker) {
      query.ticker = this.normalizeTicker(filters.ticker);
    }

    const dateFilter: Record<string, Date> = {};

    if (filters.fromDate) {
      dateFilter.$gte = this.toFilterDate(filters.fromDate, "fromDate");
    }

    if (filters.toDate) {
      dateFilter.$lte = this.toFilterDate(filters.toDate, "toDate");
    }

    if (Object.keys(dateFilter).length > 0) {
      query.transactionDate = dateFilter;
    }

    return query;
  }

  private toDto(
    transaction: PortfolioTransactionDocument,
  ): PortfolioTransactionDto {
    return {
      id: transaction._id.toString(),
      userId: transaction.userId.toString(),
      ticker: transaction.ticker,
      companyName: transaction.companyName,
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      currency: transaction.currency,
      transactionDate: transaction.transactionDate.toISOString(),
      notes: transaction.notes,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
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

  private toTransactionDate(value: string): Date {
    const transactionDate = new Date(value);

    if (
      Number.isNaN(transactionDate.getTime()) ||
      transactionDate.getTime() > Date.now()
    ) {
      throw new BadRequestException("Transaction date must not be in the future");
    }

    return transactionDate;
  }

  private toFilterDate(value: string, fieldName: string): Date {
    const filterDate = new Date(value);

    if (Number.isNaN(filterDate.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date`);
    }

    if (fieldName === "toDate" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      filterDate.setUTCHours(23, 59, 59, 999);
    }

    return filterDate;
  }

  private toUserObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user id");
    }

    return new Types.ObjectId(userId);
  }

  private toTransactionObjectId(transactionId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(transactionId)) {
      throw new NotFoundException("Transaction not found");
    }

    return new Types.ObjectId(transactionId);
  }
}
