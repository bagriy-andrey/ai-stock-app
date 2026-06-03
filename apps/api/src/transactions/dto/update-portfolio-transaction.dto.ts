import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
} from "class-validator";
import type { PortfolioTransactionType } from "@ai-stock-advisor/shared";
import { IsNotFutureDate } from "../../portfolio/dto/is-not-future-date.validator";
import { portfolioTransactionTypes } from "./create-portfolio-transaction.dto";

const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
const currencyPattern = /^[A-Z]{3}$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalString({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimUppercaseString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toUpperCase() : value;
}

export class UpdatePortfolioTransactionDto {
  @Transform(trimUppercaseString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(tickerPattern, {
    message: "ticker must be a valid stock ticker",
  })
  ticker?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @Transform(trimUppercaseString)
  @IsOptional()
  @IsEnum(portfolioTransactionTypes)
  type?: PortfolioTransactionType;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @Transform(trimUppercaseString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(currencyPattern, {
    message: "currency must be a three-letter currency code",
  })
  currency?: string;

  @IsOptional()
  @IsDateString()
  @IsNotFutureDate()
  transactionDate?: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  notes?: string;
}
