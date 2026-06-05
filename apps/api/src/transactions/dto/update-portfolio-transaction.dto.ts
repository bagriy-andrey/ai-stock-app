import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import type { PortfolioTransactionType } from "@ai-stock-advisor/shared";
import { IsNotFutureDate } from "../../portfolio/dto/is-not-future-date.validator";
import {
  currencyPattern,
  IsSafeNotes,
  purchaseNotesMaxLength,
  purchaseNumberMax,
  purchaseNumberMin,
  tickerPattern,
  trimOptionalNotes,
  trimString,
  trimUppercaseString,
} from "../../portfolio/dto/portfolio-position-validation";
import { portfolioTransactionTypes } from "./create-portfolio-transaction.dto";

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
  @MaxLength(200)
  companyName?: string;

  @Transform(trimUppercaseString)
  @IsOptional()
  @IsEnum(portfolioTransactionTypes)
  type?: PortfolioTransactionType;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  quantity?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  price?: number;

  @Transform(trimUppercaseString)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(["USD"], { message: "currency must be a supported currency" })
  @Matches(currencyPattern, {
    message: "currency must be a supported currency",
  })
  currency?: string;

  @IsOptional()
  @IsDateString()
  @IsNotFutureDate()
  transactionDate?: string;

  @Transform(trimOptionalNotes)
  @IsOptional()
  @IsString()
  @MaxLength(purchaseNotesMaxLength)
  @IsSafeNotes()
  notes?: string;
}
