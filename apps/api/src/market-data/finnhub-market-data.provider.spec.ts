import { ServiceUnavailableException } from "@nestjs/common";
import { FinnhubMarketDataProvider } from "./finnhub-market-data.provider";

describe("FinnhubMarketDataProvider", () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeAll(() => {
    process.env.FINNHUB_API_KEY = "test-finnhub-key";
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps Finnhub quote responses to the provider-neutral contract", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        c: 210.42,
        d: 1.83,
        dp: 0.88,
        h: 211,
        l: 208,
        o: 209,
        pc: 208.59,
        t: 1_780_393_600,
      }),
    );
    const provider = new FinnhubMarketDataProvider();

    await expect(provider.getQuote("AAPL")).resolves.toEqual({
      ticker: "AAPL",
      currentPrice: 210.42,
      change: 1.83,
      changePercent: 0.88,
      previousClose: 208.59,
      openPrice: 209,
      highPrice: 211,
      lowPrice: 208,
      timestamp: new Date(1_780_393_600_000).toISOString(),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://finnhub.io/api/v1/quote?symbol=AAPL&token=test-finnhub-key",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("maps Finnhub company profiles to the provider-neutral contract", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        country: "US",
        currency: "USD",
        exchange: "NASDAQ NMS - GLOBAL MARKET",
        finnhubIndustry: "Technology",
        gicsSector: "Information Technology",
        logo: "https://example.com/apple.png",
        marketCapitalization: 3_120_000,
        name: "Apple Inc.",
        ticker: "aapl",
        weburl: "https://www.apple.com",
      }),
    );
    const provider = new FinnhubMarketDataProvider();

    await expect(provider.getCompanyProfile("AAPL")).resolves.toEqual({
      ticker: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ NMS - GLOBAL MARKET",
      currency: "USD",
      country: "US",
      sector: "Information Technology",
      industry: "Technology",
      logo: "https://example.com/apple.png",
      marketCapitalization: 3_120_000_000_000,
      webUrl: "https://www.apple.com",
    });
  });

  it("maps Finnhub financial metrics to stock fundamentals", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        metric: {
          "52WeekHigh": 237.49,
          "52WeekLow": 164.08,
          epsBasicExclExtraItemsTTM: 6.91,
          marketCapitalization: 3_120_000,
          peBasicExclExtraTTM: 30.2,
        },
      }),
    );
    const provider = new FinnhubMarketDataProvider();

    await expect(provider.getCompanyFundamentals("AAPL")).resolves.toEqual({
      marketCap: 3_120_000_000_000,
      peRatio: 30.2,
      eps: 6.91,
      fiftyTwoWeekHigh: 237.49,
      fiftyTwoWeekLow: 164.08,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all&token=test-finnhub-key",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("maps provider failures to a user-safe service unavailable error", async () => {
    fetchMock.mockRejectedValue(new Error("connection failed"));
    const provider = new FinnhubMarketDataProvider();

    await expect(provider.getQuote("AAPL")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

function jsonResponse(body: unknown): Pick<Response, "json" | "ok"> {
  return {
    json: jest.fn().mockResolvedValue(body),
    ok: true,
  };
}
