export interface MockStockQuote {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  currency: "USD";
  asOf: string;
  source: "mock";
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

export interface StockQuote {
  ticker: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  previousClose: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  timestamp: string;
  currency?: string;
}

export interface CompanyProfile {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  country: string;
  sector?: string;
  industry?: string;
  logo?: string;
  marketCapitalization?: number;
  webUrl?: string;
  description?: string;
  ceo?: string;
  headquarters?: string;
  employees?: number;
  foundedYear?: number;
}

export interface StockFundamentals {
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  currency?: string;
}

export interface StockDetails {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  logoUrl?: string;
  country?: string;
  website?: string;
  description?: string;
  ceo?: string;
  headquarters?: string;
  employees?: number;
  foundedYear?: number;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  fundamentals: StockFundamentals;
}

export type StockCandleRange =
  | "1d"
  | "1w"
  | "1m"
  | "3m"
  | "6m"
  | "1y"
  | "5y"
  | "all";

export interface StockCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockCandlesResponse {
  symbol: string;
  range: StockCandleRange;
  candles: StockCandle[];
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

export interface MarketMoversResponse {
  gainers: MarketMover[];
  losers: MarketMover[];
  updatedAt: string;
}

export interface GetQuotesRequest {
  tickers: string[];
}

export interface TradingAgentAnalysisRequest {
  symbol: string;
}

export interface TradingAgentAnalysisResponse {
  symbol: string;
  recommendation: "hold";
  summary: string;
  source: "mock";
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  avatarUrl?: string;
  language: ProfileLanguage;
  theme?: ProfileTheme;
  telegramChatId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProfileLanguage = "en" | "ru" | "uk";

export type ProfileTheme = "light" | "dark" | "system";

export interface UpdateProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  language?: ProfileLanguage;
  theme?: ProfileTheme;
}

export interface GoogleLoginRequest {
  credential: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface WatchlistItemDto {
  id: string;
  userId: string;
  ticker: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistItemRequest {
  ticker: string;
  companyName?: string;
}

export interface PaginationMetaDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponseDto<T> {
  items: T[];
  meta: PaginationMetaDto;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PortfolioPositionDto {
  ticker: string;
  companyName: string;
  quantity: number;
  averagePurchasePrice: number;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  currency: string;
}

export interface PortfolioSummaryDto {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  totalStocksCount: number;
  positionsCount: number;
}

export interface PortfolioDto {
  items: PortfolioPositionDto[];
  meta: PaginationMetaDto;
  summary: PortfolioSummaryDto;
}

export interface PortfolioAllocationItemDto {
  ticker: string;
  value: number;
  percentage: number;
}

export interface PortfolioAllocationDto {
  totalPortfolioValue: number;
  allocations: PortfolioAllocationItemDto[];
}

export type PortfolioPerformanceRange =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "5Y"
  | "ALL";

export interface PortfolioPerformancePointDto {
  date: string;
  depositedCapital: number;
  portfolioValue: number;
  totalValue: number;
  totalProfit: number;
  totalReturnPercent: number;
  positionCount: number;
}

export interface CreatePortfolioPositionRequest {
  ticker: string;
  companyName: string;
  quantity: number;
  averagePurchasePrice: number;
  currency: string;
  purchaseDate: string;
  notes?: string;
}

export type UpdatePortfolioPositionRequest =
  Partial<CreatePortfolioPositionRequest>;

export type PortfolioTransactionType = "BUY" | "SELL" | "UPDATE" | "DELETE";

export interface PortfolioTransactionDto {
  id: string;
  userId: string;
  ticker: string;
  companyName: string;
  type: PortfolioTransactionType;
  quantity: number;
  price: number;
  currency: string;
  transactionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  ticker?: string;
  type?: PortfolioTransactionType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export type PaginatedTransactionsDto =
  PaginatedResponseDto<PortfolioTransactionDto>;

export interface CreatePortfolioTransactionRequest {
  ticker: string;
  companyName: string;
  type: PortfolioTransactionType;
  quantity: number;
  price: number;
  currency: string;
  transactionDate: string;
  notes?: string;
}

export type UpdatePortfolioTransactionRequest =
  Partial<CreatePortfolioTransactionRequest>;
