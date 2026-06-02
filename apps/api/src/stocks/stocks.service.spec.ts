import { NotFoundException } from "@nestjs/common";
import { StocksService } from "./stocks.service";

describe("StocksService", () => {
  const service = new StocksService();

  it("returns the mock watchlist", () => {
    expect(service.getMockQuotes()).toHaveLength(2);
  });

  it("looks up symbols case-insensitively", () => {
    expect(service.getMockQuote("aapl").symbol).toBe("AAPL");
  });

  it("rejects symbols without mock data", () => {
    expect(() => service.getMockQuote("TSLA")).toThrow(NotFoundException);
  });
});

