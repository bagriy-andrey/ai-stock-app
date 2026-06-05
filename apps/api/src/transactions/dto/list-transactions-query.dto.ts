import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";
import type { PortfolioTransactionType } from "@ai-stock-advisor/shared";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { portfolioTransactionTypes } from "./create-portfolio-transaction.dto";

const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;

function trimUppercaseString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @Transform(trimUppercaseString)
  @IsOptional()
  @IsString()
  @Matches(tickerPattern, {
    message: "ticker must be a valid stock ticker",
  })
  ticker?: string;

  @Transform(trimUppercaseString)
  @IsOptional()
  @IsEnum(portfolioTransactionTypes)
  type?: PortfolioTransactionType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
