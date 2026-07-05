export const portfolioSortFields = [
  "name",
  "quantity",
  "currentPrice",
  "currentValue",
  "profitLoss",
  "profitLossPercent",
] as const;

export type PortfolioSortField = (typeof portfolioSortFields)[number];

export const transactionSortFields = [
  "name",
  "type",
  "quantity",
  "price",
  "totalValue",
  "date",
] as const;

export type TransactionSortField = (typeof transactionSortFields)[number];

export const watchlistSortFields = [
  "ticker",
  "currentPrice",
  "changePercent",
  "companyName",
  "targetPrice",
] as const;

export type WatchlistSortField = (typeof watchlistSortFields)[number];
