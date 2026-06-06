import type {
  PortfolioPerformancePointDto,
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";
import {
  getBestPerformer,
  getDailyProfitLoss,
  getLargestPosition,
  getWorstPerformer,
} from "./portfolio-insights";

function createPosition(
  overrides: Partial<PortfolioPositionDto>,
): PortfolioPositionDto {
  return {
    averagePurchasePrice: 100,
    companyName: "Test Company",
    costBasis: 100,
    currency: "USD",
    currentPrice: 100,
    currentValue: 100,
    profitLoss: 0,
    profitLossPercent: 0,
    quantity: 1,
    ticker: "TEST",
    ...overrides,
  };
}

const positions = [
  createPosition({
    companyName: "Apple Inc",
    currentValue: 5_225.12,
    profitLoss: 527.92,
    profitLossPercent: 11.24,
    ticker: "AAPL",
  }),
  createPosition({
    companyName: "NVIDIA Corp",
    currentValue: 2_100,
    profitLoss: -40.2,
    profitLossPercent: -4.67,
    ticker: "NVDA",
  }),
  createPosition({
    companyName: "Microsoft Corp",
    currentValue: 640,
    profitLoss: 20,
    profitLossPercent: 3.2,
    ticker: "MSFT",
  }),
];

describe("portfolio insights", () => {
  it("selects best and worst performers by profit percentage", () => {
    expect(getBestPerformer(positions)?.ticker).toBe("AAPL");
    expect(getWorstPerformer(positions)?.ticker).toBe("NVDA");
  });

  it("selects the largest position and calculates allocation percentage", () => {
    const largest = getLargestPosition(positions, 7_965.12);

    expect(largest?.position.ticker).toBe("AAPL");
    expect(largest?.allocationPercent).toBeCloseTo(65.6, 1);
  });

  it("returns null insight selectors for empty data", () => {
    expect(getBestPerformer([])).toBeNull();
    expect(getWorstPerformer([])).toBeNull();
    expect(getLargestPosition([], 0)).toBeNull();
  });

  it("calculates daily profit/loss from the previous trading point", () => {
    const points: PortfolioPerformancePointDto[] = [
      { date: "2026-06-05", totalValue: 8_000 },
      { date: "2026-06-06", totalValue: 8_042.18 },
    ];
    const dailyProfitLoss = getDailyProfitLoss(points);

    expect(dailyProfitLoss?.profitLoss).toBeCloseTo(42.18, 2);
    expect(dailyProfitLoss?.profitLossPercent).toBeCloseTo(0.52725, 5);
  });

  it("returns null when daily profit/loss has no previous value", () => {
    expect(getDailyProfitLoss([{ date: "2026-06-06", totalValue: 8_000 }]))
      .toBeNull();
    expect(getDailyProfitLoss([
      { date: "2026-06-05", totalValue: 0 },
      { date: "2026-06-06", totalValue: 8_000 },
    ])).toBeNull();
  });
});
