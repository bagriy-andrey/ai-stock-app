import type { StockCandleRange } from "@ai-stock-advisor/shared";
import { IsIn } from "class-validator";

export const supportedCandleRanges: StockCandleRange[] = [
  "1d",
  "1w",
  "1m",
  "3m",
  "6m",
  "1y",
  "5y",
  "all",
];

export class GetCandlesQueryDto {
  @IsIn(supportedCandleRanges)
  range!: StockCandleRange;
}
