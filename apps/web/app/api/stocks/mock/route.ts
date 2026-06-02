import type { StockQuote } from "@ai-stock-advisor/shared";
import { NextResponse } from "next/server";

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

export function GET() {
  return NextResponse.json(mockQuotes);
}

