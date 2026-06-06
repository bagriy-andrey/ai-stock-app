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
  normalizePurchaseNumber,
  purchaseNotesMaxLength,
  purchaseNumberMax,
  purchaseNumberMin,
  tickerPattern,
  trimOptionalNotes,
  trimString,
  trimUppercaseString,
} from "../../portfolio/dto/portfolio-position-validation";

export const portfolioTransactionTypes = [
  "BUY",
  "SELL",
  "UPDATE",
  "DELETE",
] as const satisfies readonly PortfolioTransactionType[];
export const editablePortfolioTransactionTypes = [
  "BUY",
  "SELL",
] as const satisfies readonly PortfolioTransactionType[];

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
  @MaxLength(200)
  companyName!: string;

  @Transform(trimUppercaseString)
  @IsEnum(editablePortfolioTransactionTypes)
  type!: PortfolioTransactionType;

  @Transform(normalizePurchaseNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  quantity!: number;

  @Transform(normalizePurchaseNumber)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  price!: number;

  @Transform(trimUppercaseString)
  @IsString()
  @IsNotEmpty()
  @IsIn(["USD"], { message: "currency must be a supported currency" })
  @Matches(currencyPattern, {
    message: "currency must be a supported currency",
  })
  currency!: string;

  @IsDateString()
  @IsNotFutureDate()
  transactionDate!: string;

  @Transform(trimOptionalNotes)
  @IsOptional()
  @IsString()
  @MaxLength(purchaseNotesMaxLength)
  @IsSafeNotes()
  notes?: string;
}
