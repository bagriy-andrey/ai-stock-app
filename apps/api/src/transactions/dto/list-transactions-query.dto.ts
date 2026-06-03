import { Transform } from "class-transformer";
import { IsDateString, IsOptional, IsString, Matches } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

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

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
