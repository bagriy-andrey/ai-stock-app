import type { PortfolioSummaryDto } from "@ai-stock-advisor/shared";

type PortfolioReturnSummary = Pick<
  PortfolioSummaryDto,
  "positionsCount" | "totalCostBasis" | "totalCurrentValue"
>;

export function calculatePortfolioReturnPercentage(
  summary: PortfolioReturnSummary,
): number | null {
  if (summary.positionsCount === 0) {
    return 0;
  }

  if (
    !Number.isFinite(summary.totalCurrentValue) ||
    !Number.isFinite(summary.totalCostBasis) ||
    summary.totalCostBasis === 0
  ) {
    return null;
  }

  return (
    ((summary.totalCurrentValue - summary.totalCostBasis) /
      summary.totalCostBasis) *
    100
  );
}
