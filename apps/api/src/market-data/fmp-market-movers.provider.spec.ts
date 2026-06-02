import { ServiceUnavailableException } from "@nestjs/common";
import { FmpMarketMoversProvider } from "./fmp-market-movers.provider";

describe("FmpMarketMoversProvider", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.FMP_API_KEY;
  const fetchMock = jest.fn();

  beforeAll(() => {
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;

    if (originalApiKey) {
      process.env.FMP_API_KEY = originalApiKey;
    } else {
      delete process.env.FMP_API_KEY;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FMP_API_KEY = "test-fmp-key";
  });

  it("normalizes percentage strings, sorts gainers, filters invalid records, and limits results", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { symbol: "invalid-price", name: "Invalid", price: "", change: 2, changesPercentage: "20%" },
        ...Array.from({ length: 12 }, (_, index) => ({
          symbol: `ticker${index}`,
          name: `Company ${index}`,
          price: `${100 + index}`,
          change: index,
          changesPercentage: `${index}.5%`,
        })),
        { symbol: "", name: "Missing Symbol", price: 100, change: 1, changesPercentage: "50%" },
        { symbol: "MISSING_PERCENT", name: "Missing Percent", price: 100, change: 1 },
      ]),
    );
    const provider = new FmpMarketMoversProvider();

    const gainers = await provider.getTopGainers();

    expect(gainers).toHaveLength(10);
    expect(gainers[0]).toEqual({
      symbol: "TICKER11",
      name: "Company 11",
      price: 111,
      change: 11,
      changesPercentage: 11.5,
    });
    expect(gainers[9]?.changesPercentage).toBe(2.5);
  });

  it("normalizes numeric percentages, sorts losers ascending, and defaults a missing change to zero", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { symbol: "LESS", price: 50, changesPercentage: -2.5 },
        { symbol: "MOST", name: "Most Down", price: 25, change: -4, changesPercentage: -12.34 },
      ]),
    );
    const provider = new FmpMarketMoversProvider();

    await expect(provider.getTopLosers()).resolves.toEqual([
      {
        symbol: "MOST",
        name: "Most Down",
        price: 25,
        change: -4,
        changesPercentage: -12.34,
      },
      {
        symbol: "LESS",
        name: "LESS",
        price: 50,
        change: 0,
        changesPercentage: -2.5,
      },
    ]);
  });

  it("requests gainers and losers from FMP when loading market movers", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const provider = new FmpMarketMoversProvider();

    const result = await provider.getMarketMovers();

    expect(result).toEqual({
      gainers: [],
      losers: [],
      updatedAt: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/stable/biggest-gainers?apikey=test-fmp-key",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/stable/biggest-losers?apikey=test-fmp-key",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("returns a safe error when the FMP API key is missing", async () => {
    delete process.env.FMP_API_KEY;
    const provider = new FmpMarketMoversProvider();

    await expect(provider.getTopGainers()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps request failures to a safe service unavailable error", async () => {
    fetchMock.mockRejectedValue(new Error("connection failed"));
    const provider = new FmpMarketMoversProvider();

    await expect(provider.getTopGainers()).rejects.toThrow(
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
