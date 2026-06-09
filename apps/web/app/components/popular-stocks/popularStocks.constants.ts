export const popularStockTickers = [
  "NVDA",
  "AAPL",
  "MSFT",
  "META",
  "GOOGL",
  "AMZN",
  "AMD",
  "TSLA",
  "NFLX",
  "PLTR",
] as const;

export type PopularStockTicker = (typeof popularStockTickers)[number];
