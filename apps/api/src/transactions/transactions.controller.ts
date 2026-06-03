import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import type { PortfolioTransactionDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePortfolioTransactionDto } from "./dto/create-portfolio-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { UpdatePortfolioTransactionDto } from "./dto/update-portfolio-transaction.dto";
import { TransactionsService } from "./transactions.service";

@Controller("transactions")
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getTransactions(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<PortfolioTransactionDto[]> {
    return this.transactionsService.findAllForUser(
      this.getAuthenticatedUserId(request),
      query,
    );
  }

  @Get(":id")
  getTransaction(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<PortfolioTransactionDto> {
    return this.transactionsService.findOneForUser(
      this.getAuthenticatedUserId(request),
      id,
    );
  }

  @Post()
  createTransaction(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreatePortfolioTransactionDto,
  ): Promise<PortfolioTransactionDto> {
    return this.transactionsService.createForUser(
      this.getAuthenticatedUserId(request),
      body,
    );
  }

  @Patch(":id")
  updateTransaction(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdatePortfolioTransactionDto,
  ): Promise<PortfolioTransactionDto> {
    return this.transactionsService.updateForUser(
      this.getAuthenticatedUserId(request),
      id,
      body,
    );
  }

  @Delete(":id")
  @HttpCode(204)
  removeTransaction(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.transactionsService.removeForUser(
      this.getAuthenticatedUserId(request),
      id,
    );
  }

  private getAuthenticatedUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return request.user.sub;
  }
}
