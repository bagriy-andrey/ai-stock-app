import type { MarketDataProvider } from "./market-data-provider";
import type { HistoricalMarketDataProvider } from "./historical-market-data-provider";
import { InMemoryCacheService } from "./in-memory-cache.service";
import { MarketDataService } from "./market-data.service";
import type { MarketMoversProvider } from "./market-movers-provider";

describe("MarketDataService", () => {
  const provider = {
    searchSymbols: jest.fn(),
    getQuote: jest.fn(),
    getQuotes: jest.fn(),
    getCompanyProfile: jest.fn(),
    getCompanyFundamentals: jest.fn(),
  } as jest.Mocked<MarketDataProvider>;
  const historicalProvider = {
    getCandles: jest.fn(),
  } as jest.Mocked<HistoricalMarketDataProvider>;
  const marketMoversProvider = {
    getMarketMovers: jest.fn(),
  } as jest.Mocked<MarketMoversProvider>;
  let service: MarketDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    provider.getCompanyFundamentals.mockResolvedValue({});
    service = new MarketDataService(
      provider,
      historicalProvider,
      marketMoversProvider,
      new InMemoryCacheService(),
    );
  });

  it("normalizes and caches quotes", async () => {
    provider.getQuote.mockResolvedValue({
      ticker: "AAPL",
      currentPrice: 210.42,
      change: 1.83,
      changePercent: 0.88,
      previousClose: 208.59,
      openPrice: 209,
      highPrice: 211,
      lowPrice: 208,
      timestamp: "2026-06-02T09:00:00.000Z",
    });

    await service.getQuote(" aapl ");
    await service.getQuote("AAPL");

    expect(provider.getQuote).toHaveBeenCalledTimes(1);
    expect(provider.getQuote).toHaveBeenCalledWith("AAPL");
  });

  it("uses cached per-ticker quotes for bulk requests", async () => {
    provider.getQuote.mockImplementation(async (ticker) => ({
      ticker,
      currentPrice: 100,
      change: 1,
      changePercent: 1,
      previousClose: 99,
      openPrice: 99,
      highPrice: 101,
      lowPrice: 98,
      timestamp: "2026-06-02T09:00:00.000Z",
    }));

    await service.getQuote("AAPL");
    await expect(service.getQuotes(["aapl", "msft"])).resolves.toHaveLength(2);

    expect(provider.getQuote).toHaveBeenCalledTimes(2);
    expect(provider.getQuote).toHaveBeenCalledWith("MSFT");
  });

  it("enriches and caches symbol searches with company profiles", async () => {
    provider.searchSymbols.mockResolvedValue([
      {
        ticker: "AAPL",
        name: "Apple Inc",
        exchange: "",
        currency: "",
        type: "Common Stock",
      },
    ]);
    provider.getCompanyProfile.mockResolvedValue({
      ticker: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      country: "US",
    });

    await expect(service.searchSymbols(" Apple ")).resolves.toEqual([
      {
        ticker: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ NMS - GLOBAL MARKET",
        currency: "USD",
        type: "Common Stock",
      },
    ]);
    await service.searchSymbols("apple");

    expect(provider.searchSymbols).toHaveBeenCalledTimes(1);
    expect(provider.searchSymbols).toHaveBeenCalledWith("apple");
    expect(provider.getCompanyProfile).toHaveBeenCalledTimes(1);
  });

  it("returns base search results when profile enrichment fails", async () => {
    const result = {
      ticker: "AAPL",
      name: "Apple Inc",
      exchange: "",
      currency: "",
      type: "Common Stock",
    };
    provider.searchSymbols.mockResolvedValue([result]);
    provider.getCompanyProfile.mockRejectedValue(new Error("provider error"));

    await expect(service.searchSymbols("apple")).resolves.toEqual([result]);
  });

  it("returns normalized stock details from a cached quote and profile", async () => {
    provider.getQuote.mockResolvedValue({
      ticker: "AAPL",
      currentPrice: 210.42,
      change: 1.83,
      changePercent: 0.88,
      previousClose: 208.59,
      openPrice: 209,
      highPrice: 211,
      lowPrice: 208,
      timestamp: "2026-06-02T09:00:00.000Z",
    });
    provider.getCompanyProfile.mockResolvedValue({
      ticker: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      country: "US",
      sector: "Technology",
      industry: "Consumer Electronics",
      logo: "https://example.com/apple.png",
      marketCapitalization: 3_100_000_000_000,
    });
    provider.getCompanyFundamentals.mockResolvedValue({
      marketCap: 3_120_000_000_000,
      peRatio: 30.2,
      eps: 6.91,
      fiftyTwoWeekHigh: 237.49,
      fiftyTwoWeekLow: 164.08,
    });

    await expect(service.getStockDetails(" aapl ")).resolves.toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      logoUrl: "https://example.com/apple.png",
      currentPrice: 210.42,
      change: 1.83,
      percentChange: 0.88,
      previousClose: 208.59,
      open: 209,
      high: 211,
      low: 208,
      fundamentals: {
        marketCap: 3_120_000_000_000,
        peRatio: 30.2,
        eps: 6.91,
        fiftyTwoWeekHigh: 237.49,
        fiftyTwoWeekLow: 164.08,
        sector: "Technology",
        industry: "Consumer Electronics",
        exchange: "NASDAQ NMS - GLOBAL MARKET",
        currency: "USD",
      },
    });
  });

  it("keeps stock details available when fundamentals metrics fail", async () => {
    provider.getQuote.mockResolvedValue({
      ticker: "AAPL",
      currentPrice: 210.42,
      change: 1.83,
      changePercent: 0.88,
      previousClose: 208.59,
      openPrice: 209,
      highPrice: 211,
      lowPrice: 208,
      timestamp: "2026-06-02T09:00:00.000Z",
    });
    provider.getCompanyProfile.mockResolvedValue({
      ticker: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      country: "US",
      industry: "Consumer Electronics",
      marketCapitalization: 3_100_000_000_000,
    });
    provider.getCompanyFundamentals.mockRejectedValue(new Error("provider error"));

    await expect(service.getStockDetails("AAPL")).resolves.toEqual({
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      logoUrl: undefined,
      currentPrice: 210.42,
      change: 1.83,
      percentChange: 0.88,
      previousClose: 208.59,
      open: 209,
      high: 211,
      low: 208,
      fundamentals: {
        marketCap: 3_100_000_000_000,
        peRatio: undefined,
        eps: undefined,
        fiftyTwoWeekHigh: undefined,
        fiftyTwoWeekLow: undefined,
        sector: undefined,
        industry: "Consumer Electronics",
        exchange: "NASDAQ NMS - GLOBAL MARKET",
        currency: "USD",
      },
    });
  });

  it("normalizes and caches candle requests by ticker and range", async () => {
    historicalProvider.getCandles.mockResolvedValue([]);

    await expect(service.getCandles(" aapl ", "1m")).resolves.toEqual({
      symbol: "AAPL",
      range: "1m",
      candles: [],
    });
    await service.getCandles("AAPL", "1m");

    expect(historicalProvider.getCandles).toHaveBeenCalledTimes(1);
    expect(historicalProvider.getCandles).toHaveBeenCalledWith("AAPL", "1m");
  });

  it("caches market movers responses", async () => {
    marketMoversProvider.getMarketMovers.mockResolvedValue({
      gainers: [],
      losers: [],
      updatedAt: "2026-06-02T09:00:00.000Z",
    });

    await service.getMarketMovers();
    await service.getMarketMovers();

    expect(marketMoversProvider.getMarketMovers).toHaveBeenCalledTimes(1);
  });
});
