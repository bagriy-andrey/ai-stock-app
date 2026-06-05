import { Transform } from "class-transformer";
import {
  IsDateString,
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
import { IsNotFutureDate } from "./is-not-future-date.validator";
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
} from "./portfolio-position-validation";

export class UpdatePortfolioPositionDto {
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

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  quantity?: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  averagePurchasePrice?: number;

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
  purchaseDate?: string;

  @Transform(trimOptionalNotes)
  @IsOptional()
  @IsString()
  @MaxLength(purchaseNotesMaxLength)
  @IsSafeNotes()
  notes?: string;
}
