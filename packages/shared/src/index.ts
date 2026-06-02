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
  avatarUrl?: string;
  telegramChatId?: string;
  createdAt: string;
  updatedAt: string;
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
