import {
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { YahooFinanceProvider } from "./yahoo-finance.provider";

describe("YahooFinanceProvider", () => {
  const yahooFinance = {
    chart: jest.fn(),
  };
  let provider: YahooFinanceProvider;

  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date("2026-06-02T12:00:00.000Z"),
    });
    jest.clearAllMocks();
    yahooFinance.chart.mockResolvedValue({ quotes: [] });
    provider = new YahooFinanceProvider(yahooFinance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ["1d", "2026-06-01T12:00:00.000Z", "5m"],
    ["1w", "2026-05-26T12:00:00.000Z", "1h"],
    ["1m", "2026-05-02T12:00:00.000Z", "1d"],
    ["1y", "2025-06-02T12:00:00.000Z", "1wk"],
  ] as const)(
    "maps the %s range to the expected Yahoo chart period and interval",
    async (range, expectedPeriodStart, expectedInterval) => {
      await provider.getCandles("AAPL", range);

      expect(yahooFinance.chart).toHaveBeenCalledWith("AAPL", {
        period1: new Date(expectedPeriodStart),
        period2: new Date("2026-06-02T12:00:00.000Z"),
        interval: expectedInterval,
      });
    },
  );

  it("normalizes complete Yahoo chart quotes and sorts them by timestamp", async () => {
    yahooFinance.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date("2026-06-02T12:05:00.000Z"),
          open: 209,
          high: 211,
          low: 208,
          close: 210.42,
          volume: 12_000,
        },
        {
          date: new Date("2026-06-02T12:00:00.000Z"),
          open: 208,
          high: 209,
          low: 207.5,
          close: 208.5,
          volume: 10_000,
        },
      ],
    });

    await expect(provider.getCandles("AAPL", "1d")).resolves.toEqual([
      {
        timestamp: 1_780_401_600,
        open: 208,
        high: 209,
        low: 207.5,
        close: 208.5,
        volume: 10_000,
      },
      {
        timestamp: 1_780_401_900,
        open: 209,
        high: 211,
        low: 208,
        close: 210.42,
        volume: 12_000,
      },
    ]);
  });

  it("filters quotes with null values and incomplete records", async () => {
    yahooFinance.chart.mockResolvedValue({
      quotes: [
        {
          date: new Date("2026-06-02T12:00:00.000Z"),
          open: 208,
          high: 209,
          low: 207.5,
          close: 208.5,
          volume: 10_000,
        },
        {
          date: new Date("2026-06-02T12:05:00.000Z"),
          open: 209,
          high: 211,
          low: 208,
          close: null,
          volume: 12_000,
        },
        {
          date: new Date("invalid"),
          open: 209,
          high: 211,
          low: 208,
          close: 210,
          volume: 12_000,
        },
      ],
    });

    await expect(provider.getCandles("AAPL", "1d")).resolves.toHaveLength(1);
  });

  it("maps invalid symbols to a user-safe not found error", async () => {
    yahooFinance.chart.mockRejectedValue(
      new Error("No data found, symbol may be delisted"),
    );

    await expect(provider.getCandles("INVALID", "1d")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("maps Yahoo Finance failures to a user-safe unavailable error", async () => {
    yahooFinance.chart.mockRejectedValue(new Error("connection failed"));

    await expect(provider.getCandles("AAPL", "1d")).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
