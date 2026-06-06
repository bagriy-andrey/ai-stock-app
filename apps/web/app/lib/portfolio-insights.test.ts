import type {
  PortfolioPerformancePointDto,
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";
import {
  getBestPerformer,
  getDailyProfitLoss,
  getLargestPosition,
  getTodaysProfitLoss,
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

  it("ignores zero-percent positions when selecting performers", () => {
    const flatPosition = createPosition({
      profitLoss: 0,
      profitLossPercent: 0,
      ticker: "FLAT",
    });

    expect(getBestPerformer([flatPosition])).toBeNull();
    expect(getWorstPerformer([flatPosition])).toBeNull();
    expect(getWorstPerformer([flatPosition, positions[1]])?.ticker).toBe("NVDA");
  });

  it("ignores positions with invalid profit calculations", () => {
    const invalidWinner = createPosition({
      averagePurchasePrice: 0,
      costBasis: 0,
      currentValue: 500,
      profitLoss: 500,
      profitLossPercent: 100,
      ticker: "BADWIN",
    });
    const invalidLoser = createPosition({
      costBasis: Number.NaN,
      currentValue: 50,
      profitLoss: -50,
      profitLossPercent: -50,
      ticker: "BADLOSS",
    });

    expect(getBestPerformer([invalidWinner, positions[2]])?.ticker).toBe("MSFT");
    expect(getWorstPerformer([invalidLoser, positions[1]])?.ticker).toBe("NVDA");
  });

  it("allows zero current value as a valid losing position", () => {
    const worthlessPosition = createPosition({
      currentValue: 0,
      profitLoss: -100,
      profitLossPercent: -100,
      ticker: "ZERO",
    });

    expect(getWorstPerformer([worthlessPosition])?.ticker).toBe("ZERO");
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
      buildPerformancePoint("2026-06-05", 8_000),
      buildPerformancePoint("2026-06-06", 8_042.18),
    ];
    const dailyProfitLoss = getDailyProfitLoss(points);
    const todaysProfitLoss = getTodaysProfitLoss(points);

    expect(dailyProfitLoss?.profitLoss).toBeCloseTo(42.18, 2);
    expect(dailyProfitLoss?.profitLossPercent).toBeCloseTo(0.52725, 5);
    expect(todaysProfitLoss).toEqual(dailyProfitLoss);
  });

  it("returns null when daily profit/loss has no previous value", () => {
    expect(getDailyProfitLoss([buildPerformancePoint("2026-06-06", 8_000)]))
      .toBeNull();
    expect(getDailyProfitLoss([
      buildPerformancePoint("2026-06-05", 0),
      buildPerformancePoint("2026-06-06", 8_000),
    ])).toBeNull();
  });
});

function buildPerformancePoint(
  date: string,
  portfolioValue: number,
): PortfolioPerformancePointDto {
  return {
    date,
    depositedCapital: 7_500,
    portfolioValue,
    totalValue: portfolioValue,
    totalProfit: portfolioValue - 7_500,
    totalReturnPercent:
      portfolioValue === 0 ? 0 : ((portfolioValue - 7_500) / 7_500) * 100,
    positionCount: portfolioValue > 0 ? 3 : 0,
  };
}
