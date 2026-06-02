"use client";

import type { MockStockQuote } from "@ai-stock-advisor/shared";
import Link from "next/link";
import { useAuth } from "./components/auth/AuthProvider";

interface DashboardProps {
  mockQuotes: MockStockQuote[];
}

export function Dashboard({ mockQuotes }: DashboardProps) {
  const { user, logout } = useAuth();

  return (
    <main>
      <nav className="top-nav" aria-label="User">
        <Link href="/watchlist">Watchlist</Link>
        <Link href="/profile">Profile</Link>
        <span>{user?.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </nav>

      <header>
        <p className="eyebrow">MVP dashboard</p>
        <h1>AI Stock Advisor</h1>
        <p className="subtitle">
          The dashboard still shows scaffold quotes. Open the watchlist to
          search stocks and view live Finnhub market data.
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
