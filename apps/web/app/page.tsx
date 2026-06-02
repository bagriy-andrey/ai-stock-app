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

export default function Home() {
  return (
    <main>
      <header>
        <p className="eyebrow">MVP dashboard</p>
        <h1>AI Stock Advisor</h1>
        <p className="subtitle">
          A local development shell using mock quotes. No live market data is
          connected yet.
        </p>
      </header>

      <section aria-labelledby="watchlist-heading">
        <h2 id="watchlist-heading">Mock watchlist</h2>
        <div className="quote-grid">
          {mockQuotes.map((quote) => (
            <article className="quote-card" key={quote.symbol}>
              <div>
                <strong>{quote.symbol}</strong>
                <p>{quote.companyName}</p>
              </div>
              <div className="quote-price">
                <span>${quote.price.toFixed(2)}</span>
                <small className={quote.change >= 0 ? "positive" : "negative"}>
                  {quote.change >= 0 ? "+" : ""}
                  {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        Next mock endpoint: <code>/api/stocks/mock</code>
      </footer>
    </main>
  );
}

