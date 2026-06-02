import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
} from "class-validator";

export class GetQuotesDto {
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((ticker) =>
          typeof ticker === "string" ? ticker.trim().toUpperCase() : ticker,
        )
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(/^[A-Z][A-Z0-9.-]{0,9}$/, {
    each: true,
    message: "each ticker must be a valid stock ticker",
  })
  tickers!: string[];
}
