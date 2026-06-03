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

export const portfolioTransactionTypes = [
  "BUY",
  "SELL",
  "UPDATE",
  "DELETE",
] as const satisfies readonly PortfolioTransactionType[];

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

export class CreatePortfolioTransactionDto {
  @Transform(trimUppercaseString)
  @IsString()
  @IsNotEmpty()
  @Matches(tickerPattern, {
    message: "ticker must be a valid stock ticker",
  })
  ticker!: string;

  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @Transform(trimUppercaseString)
  @IsEnum(portfolioTransactionTypes)
  type!: PortfolioTransactionType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price!: number;

  @Transform(trimUppercaseString)
  @IsString()
  @IsNotEmpty()
  @Matches(currencyPattern, {
    message: "currency must be a three-letter currency code",
  })
  currency!: string;

  @IsDateString()
  @IsNotFutureDate()
  transactionDate!: string;

  @Transform(trimOptionalString)
  @IsOptional()
  @IsString()
  notes?: string;
}
