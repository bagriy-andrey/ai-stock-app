import { Injectable, NotFoundException } from "@nestjs/common";
import type { StockQuote } from "@ai-stock-advisor/shared";

const mockQuotes: StockQuote[] = [
  {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    price: 210.42,
    change: 1.83,
    changePercent: 0.88,
    currency: "USD",
    asOf: "2026-06-02T09:00:00.000Z",
    source: "mock",
  },
  {
    symbol: "MSFT",
    companyName: "Microsoft Corporation",
    price: 468.91,
    change: -2.14,
    changePercent: -0.45,
    currency: "USD",
    asOf: "2026-06-02T09:00:00.000Z",
    source: "mock",
  },
];

@Injectable()
export class StocksService {
  getMockQuotes(): StockQuote[] {
    return mockQuotes;
  }

  getMockQuote(symbol: string): StockQuote {
    const quote = mockQuotes.find(
      (candidate) => candidate.symbol === symbol.toUpperCase(),
    );

    if (!quote) {
      throw new NotFoundException(`No mock quote available for ${symbol}`);
    }

    return quote;
  }
}

