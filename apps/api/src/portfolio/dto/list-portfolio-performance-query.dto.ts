import type { PortfolioPerformanceRange } from "@ai-stock-advisor/shared";
import { IsIn, IsOptional } from "class-validator";

export const portfolioPerformanceRanges = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "ALL",
] as const;

export class ListPortfolioPerformanceQueryDto {
  @IsOptional()
  @IsIn(portfolioPerformanceRanges)
  range: PortfolioPerformanceRange = "1M";
}
