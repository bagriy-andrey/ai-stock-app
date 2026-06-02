"use client";

import type { StockQuote, StockSearchResult } from "@ai-stock-advisor/shared";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "../components/auth/AuthProvider";
import {
  fetchMarketQuotes,
  searchMarketSymbols,
} from "../lib/market-data-api";
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from "../lib/watchlist-api";

const watchlistQueryKey = ["watchlist"] as const;

export function WatchlistPage() {
  const queryClient = useQueryClient();
  const { accessToken, user, logout } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), 350);

  const watchlistQuery = useQuery({
    queryKey: watchlistQueryKey,
    queryFn: () => fetchWatchlist(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  const addMutation = useMutation({
    mutationFn: (stock: StockSearchResult) =>
      addWatchlistItem(accessToken ?? "", {
        ticker: stock.ticker,
        companyName: stock.name,
      }),
    onSuccess: async () => {
      setSearchInput("");
      setSelectedStock(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWatchlistItem(accessToken ?? "", id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const items = watchlistQuery.data ?? [];
  const searchQuery = useQuery({
    queryKey: ["market-data", "search", debouncedSearchInput],
    queryFn: () =>
      searchMarketSymbols(accessToken ?? "", debouncedSearchInput),
    enabled:
      Boolean(accessToken) &&
      !selectedStock &&
      debouncedSearchInput.length >= 2,
    retry: false,
  });
  const quotesQuery = useQuery({
    queryKey: ["market-data", "quotes", ...items.map((item) => item.ticker)],
    queryFn: () =>
      fetchMarketQuotes(accessToken ?? "", {
        tickers: items.map((item) => item.ticker),
      }),
    enabled: Boolean(accessToken) && items.length > 0,
    refetchInterval: 2 * 60 * 1_000,
    retry: false,
  });
  const quotesByTicker = useMemo(
    () =>
      new Map(
        (quotesQuery.data ?? []).map((quote) => [quote.ticker, quote] as const),
      ),
    [quotesQuery.data],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStock) {
      setFormError("Search for a stock and select it from the results.");
      return;
    }

    addMutation.mutate(selectedStock);
  };

  const errorMessage =
    formError ??
    (addMutation.error instanceof Error ? addMutation.error.message : null) ??
    (removeMutation.error instanceof Error ? removeMutation.error.message : null);

  return (
    <main>
      <nav className="top-nav" aria-label="User">
        <Link href="/">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <span>{user?.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </nav>

      <header>
        <p className="eyebrow">Watchlist</p>
        <h1>Tracked Stocks</h1>
        <p className="subtitle">
          Search stocks by company name or ticker and track their latest market
          price.
        </p>
      </header>

      <section aria-labelledby="add-ticker-heading" className="watchlist-panel">
        <h2 id="add-ticker-heading">Add stock</h2>
        <form className="watchlist-form" onSubmit={onSubmit}>
          <div className="stock-search">
            <label htmlFor="stock-search">Ticker or company name</label>
            <input
              id="stock-search"
              name="stock-search"
              placeholder="Apple or AAPL"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSelectedStock(null);
                setFormError(null);
              }}
              autoComplete="off"
              disabled={addMutation.isPending}
            />
            {!selectedStock && debouncedSearchInput.length >= 2 ? (
              <SearchResults
                error={searchQuery.error}
                isLoading={searchQuery.isLoading}
                results={searchQuery.data ?? []}
                onSelect={(stock) => {
                  setSelectedStock(stock);
                  setSearchInput(stock.ticker);
                  setFormError(null);
                }}
              />
            ) : null}
          </div>
          <button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add"}
          </button>
        </form>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      <section aria-labelledby="watchlist-heading">
        <h2 id="watchlist-heading">Your watchlist</h2>
        {quotesQuery.error instanceof Error ? (
          <p className="error-text">
            Live prices are temporarily unavailable. Your saved watchlist is
            still shown.
          </p>
        ) : null}

        {watchlistQuery.isLoading ? (
          <p>Loading watchlist...</p>
        ) : watchlistQuery.error instanceof Error ? (
          <p className="error-text">{watchlistQuery.error.message}</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <strong>No stocks yet</strong>
            <p>Search for a stock to start building your watchlist.</p>
          </div>
        ) : (
          <div className="watchlist-list">
            {items.map((item) => (
              <article className="quote-card watchlist-item" key={item.id}>
                <div>
                  <strong>{item.ticker}</strong>
                  <p>{item.companyName ?? "Company name not set"}</p>
                </div>
                <QuotePrice
                  isLoading={quotesQuery.isLoading}
                  quote={quotesByTicker.get(item.ticker)}
                />
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={
                    removeMutation.isPending &&
                    removeMutation.variables === item.id
                  }
                >
                  {removeMutation.isPending &&
                  removeMutation.variables === item.id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

interface SearchResultsProps {
  error: Error | null;
  isLoading: boolean;
  results: StockSearchResult[];
  onSelect: (stock: StockSearchResult) => void;
}

function SearchResults({
  error,
  isLoading,
  results,
  onSelect,
}: SearchResultsProps) {
  if (isLoading) {
    return <p className="search-status">Searching...</p>;
  }

  if (error) {
    return (
      <p className="search-status error-text">
        Stock search is temporarily unavailable.
      </p>
    );
  }

  if (results.length === 0) {
    return <p className="search-status">No matching stocks found.</p>;
  }

  return (
    <ul className="search-results" aria-label="Stock search results">
      {results.map((stock) => (
        <li key={`${stock.ticker}-${stock.exchange}`}>
          <button type="button" onClick={() => onSelect(stock)}>
            <strong>{stock.ticker}</strong>
            <span>{stock.name}</span>
            <small>{stock.exchange || "Exchange unavailable"}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface QuotePriceProps {
  isLoading: boolean;
  quote?: StockQuote;
}

function QuotePrice({ isLoading, quote }: QuotePriceProps) {
  if (isLoading) {
    return <div className="quote-price">Loading price...</div>;
  }

  if (!quote) {
    return <div className="quote-price">Price unavailable</div>;
  }

  return (
    <div className="quote-price">
      <span>{formatPrice(quote.currentPrice, quote.currency)}</span>
      <small className={quote.change >= 0 ? "positive" : "negative"}>
        {quote.change >= 0 ? "+" : ""}
        {quote.change.toFixed(2)} ({quote.change >= 0 ? "+" : ""}
        {quote.changePercent.toFixed(2)}%)
      </small>
    </div>
  );
}

function formatPrice(price: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}

function useDebouncedValue(value: string, delayMilliseconds: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedValue(value),
      delayMilliseconds,
    );

    return () => window.clearTimeout(timeout);
  }, [delayMilliseconds, value]);

  return debouncedValue;
}
