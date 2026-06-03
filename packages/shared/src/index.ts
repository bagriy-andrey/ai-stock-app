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
  industry?: string;
  logo?: string;
  marketCapitalization?: number;
  webUrl?: string;
}

export interface StockDetails {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  logoUrl?: string;
  currentPrice: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export type StockCandleRange = "1d" | "1w" | "1m" | "1y";

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

export interface PortfolioPositionDto {
  id: string;
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
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioSummaryDto {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  positionsCount: number;
}

export interface PortfolioDto {
  summary: PortfolioSummaryDto;
  positions: PortfolioPositionDto[];
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
