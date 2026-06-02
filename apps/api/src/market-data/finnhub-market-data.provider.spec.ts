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
