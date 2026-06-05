import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsNotEmpty,
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

export class CreatePortfolioPositionDto {
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

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  quantity!: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(purchaseNumberMin)
  @Max(purchaseNumberMax)
  averagePurchasePrice!: number;

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
  purchaseDate!: string;

  @Transform(trimOptionalNotes)
  @IsOptional()
  @IsString()
  @MaxLength(purchaseNotesMaxLength)
  @IsSafeNotes()
  notes?: string;
}
