import type { PortfolioSummaryDto } from "@ai-stock-advisor/shared";
import { calculatePortfolioReturnPercentage } from "./portfolio-summary";

function createSummary(
  overrides: Partial<PortfolioSummaryDto>,
): PortfolioSummaryDto {
  return {
    positionsCount: 1,
    totalCostBasis: 100,
    totalCurrentValue: 100,
    totalProfitLoss: 0,
    totalProfitLossPercent: 0,
    totalStocksCount: 1,
    ...overrides,
  };
}

describe("portfolio summary", () => {
  it("calculates positive total return from total value and total cost", () => {
    expect(
      calculatePortfolioReturnPercentage(
        createSummary({
          totalCostBasis: 6_370.89,
          totalCurrentValue: 7_120.05,
          totalProfitLoss: 749.16,
        }),
      ),
    ).toBeCloseTo(11.7591, 4);
  });

  it("calculates negative total return", () => {
    expect(
      calculatePortfolioReturnPercentage(
        createSummary({
          totalCostBasis: 1_000,
          totalCurrentValue: 956.8,
          totalProfitLoss: -43.2,
        }),
      ),
    ).toBeCloseTo(-4.32, 2);
  });

  it("returns zero for flat portfolios", () => {
    expect(calculatePortfolioReturnPercentage(createSummary({}))).toBe(0);
  });

  it("returns zero for empty portfolios", () => {
    expect(
      calculatePortfolioReturnPercentage(
        createSummary({
          positionsCount: 0,
          totalCostBasis: 0,
          totalCurrentValue: 0,
          totalStocksCount: 0,
        }),
      ),
    ).toBe(0);
  });

  it("returns null when total cost is zero for a non-empty portfolio", () => {
    expect(
      calculatePortfolioReturnPercentage(
        createSummary({
          totalCostBasis: 0,
          totalCurrentValue: 100,
        }),
      ),
    ).toBeNull();
  });
});
