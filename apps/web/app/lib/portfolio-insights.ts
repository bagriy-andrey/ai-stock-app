import type {
  PortfolioPerformancePointDto,
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";

export interface LargestPositionInsight {
  allocationPercent: number;
  position: PortfolioPositionDto;
}

export interface DailyProfitLossInsight {
  profitLoss: number;
  profitLossPercent: number;
}

export function getBestPerformer(
  positions: PortfolioPositionDto[],
): PortfolioPositionDto | null {
  return getExtremePosition(
    positions.filter(
      (position) =>
        hasValidProfitCalculation(position) && position.profitLossPercent > 0,
    ),
    (current, candidate) =>
      candidate.profitLossPercent > current.profitLossPercent,
  );
}

export function getWorstPerformer(
  positions: PortfolioPositionDto[],
): PortfolioPositionDto | null {
  return getExtremePosition(
    positions.filter(
      (position) =>
        hasValidProfitCalculation(position) && position.profitLossPercent < 0,
    ),
    (current, candidate) =>
      candidate.profitLossPercent < current.profitLossPercent,
  );
}

export function getLargestPosition(
  positions: PortfolioPositionDto[],
  totalPortfolioValue: number,
): LargestPositionInsight | null {
  const position = getExtremePosition(
    positions.filter(
      (candidate) =>
        Number.isFinite(candidate.currentValue) && candidate.currentValue > 0,
    ),
    (current, candidate) =>
      candidate.currentValue > current.currentValue,
  );

  if (!position || !Number.isFinite(totalPortfolioValue) || totalPortfolioValue <= 0) {
    return null;
  }

  return {
    allocationPercent: (position.currentValue / totalPortfolioValue) * 100,
    position,
  };
}

export function getTodaysProfitLoss(
  points: PortfolioPerformancePointDto[],
): DailyProfitLossInsight | null {
  const sortedPoints = [...points].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  const currentPoint = sortedPoints[sortedPoints.length - 1];
  const previousPoint = sortedPoints[sortedPoints.length - 2];

  if (!currentPoint || !previousPoint || previousPoint.totalValue <= 0) {
    return null;
  }

  const profitLoss = currentPoint.totalValue - previousPoint.totalValue;

  return {
    profitLoss,
    profitLossPercent: (profitLoss / previousPoint.totalValue) * 100,
  };
}

export const getDailyProfitLoss = getTodaysProfitLoss;

function hasValidProfitCalculation(position: PortfolioPositionDto): boolean {
  return (
    Number.isFinite(position.quantity) &&
    position.quantity > 0 &&
    Number.isFinite(position.currentValue) &&
    position.currentValue >= 0 &&
    Number.isFinite(position.costBasis) &&
    position.costBasis > 0 &&
    Number.isFinite(position.averagePurchasePrice) &&
    position.averagePurchasePrice > 0 &&
    Number.isFinite(position.profitLoss) &&
    Number.isFinite(position.profitLossPercent)
  );
}

function getExtremePosition(
  positions: PortfolioPositionDto[],
  shouldReplace: (
    current: PortfolioPositionDto,
    candidate: PortfolioPositionDto,
  ) => boolean,
): PortfolioPositionDto | null {
  return positions.reduce<PortfolioPositionDto | null>((current, candidate) => {
    if (!current || shouldReplace(current, candidate)) {
      return candidate;
    }

    return current;
  }, null);
}
