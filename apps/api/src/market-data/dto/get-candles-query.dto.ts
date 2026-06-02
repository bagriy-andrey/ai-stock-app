import type { StockCandleRange } from "@ai-stock-advisor/shared";
import { IsIn } from "class-validator";

export class GetCandlesQueryDto {
  @IsIn(["1d", "1w", "1m", "1y"])
  range!: StockCandleRange;
}
