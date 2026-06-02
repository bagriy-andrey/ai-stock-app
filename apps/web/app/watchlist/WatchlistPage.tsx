"use client";

import type {
  CompanyProfile,
  StockSearchResult,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import type { Dictionary } from "../dictionaries";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../components/auth/AuthProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { useI18n } from "../components/i18n/I18nProvider";
import { EmptyState } from "../components/ui/EmptyState";
import { StockCard } from "../components/watchlist/StockCard";
import { StockDetailsModal } from "../components/watchlist/StockDetailsModal";
import {
  fetchCompanyProfile,
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
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    null,
  );
  const [detailsItem, setDetailsItem] = useState<WatchlistItemDto | null>(null);
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
  const companyProfileQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["market-data", "company", item.ticker],
      queryFn: () => fetchCompanyProfile(accessToken ?? "", item.ticker),
      enabled: Boolean(accessToken),
      staleTime: 24 * 60 * 60 * 1_000,
      retry: false,
    })),
  });
  const profilesByTicker = useMemo(
    () =>
      new Map(
        companyProfileQueries
          .map((query) => query.data)
          .filter((profile): profile is CompanyProfile => Boolean(profile))
          .map((profile) => [profile.ticker, profile] as const),
      ),
    [companyProfileQueries],
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStock) {
      setFormError(t.chooseStockError);
      return;
    }

    addMutation.mutate(selectedStock);
  };

  const errorMessage =
    formError ??
    (addMutation.error instanceof Error ? t.addStockError : null) ??
    (removeMutation.error instanceof Error ? t.removeStockError : null);

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">{t.watchlist}</p>
        <h1>{t.trackedStocks}</h1>
        <p className="subtitle">{t.watchlistSubtitle}</p>
      </header>

      <section aria-labelledby="add-ticker-heading" className="page-section watchlist-panel">
        <h2 id="add-ticker-heading">{t.addStock}</h2>
        <form className="watchlist-form" onSubmit={onSubmit}>
          <div className="stock-search">
            <label htmlFor="stock-search">{t.tickerOrCompanyName}</label>
            <input
              id="stock-search"
              name="stock-search"
              placeholder={t.stockSearchPlaceholder}
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
                t={t}
                onSelect={(stock) => {
                  setSelectedStock(stock);
                  setSearchInput(stock.ticker);
                  setFormError(null);
                }}
              />
            ) : null}
          </div>
          <button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? t.adding : t.add}
          </button>
        </form>
        {errorMessage ? <p className="error-text" role="alert">{errorMessage}</p> : null}
      </section>

      <section aria-labelledby="watchlist-heading" className="page-section">
        <h2 id="watchlist-heading">{t.yourWatchlist}</h2>
        {quotesQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.livePricesUnavailable}</p>
        ) : null}

        {watchlistQuery.isLoading ? (
          <p role="status">{t.loadingWatchlist}</p>
        ) : watchlistQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.watchlistLoadError}</p>
        ) : items.length === 0 ? (
          <EmptyState description={t.watchlistEmpty} title={t.noStocksYet} />
        ) : (
          <div className="watchlist-list">
            {items.map((item) => (
              <StockCard
                isPriceLoading={quotesQuery.isLoading}
                isRemoving={
                  removeMutation.isPending &&
                  removeMutation.variables === item.id
                }
                item={item}
                key={item.id}
                language={language}
                onOpen={() => setDetailsItem(item)}
                onRemove={() => removeMutation.mutate(item.id)}
                profile={profilesByTicker.get(item.ticker)}
                quote={quotesByTicker.get(item.ticker)}
                t={t}
              />
            ))}
          </div>
        )}
      </section>
      {detailsItem ? (
        <StockDetailsModal
          accessToken={accessToken ?? ""}
          item={detailsItem}
          language={language}
          onClose={() => setDetailsItem(null)}
          t={t}
        />
      ) : null}
    </main>
  );
}

interface SearchResultsProps {
  error: Error | null;
  isLoading: boolean;
  results: StockSearchResult[];
  onSelect: (stock: StockSearchResult) => void;
  t: Dictionary;
}

function SearchResults({
  error,
  isLoading,
  results,
  onSelect,
  t,
}: SearchResultsProps) {
  if (isLoading) {
    return <p className="search-status" role="status">{t.searching}</p>;
  }

  if (error) {
    return (
      <p className="search-status error-text" role="alert">
        {t.stockSearchUnavailable}
      </p>
    );
  }

  if (results.length === 0) {
    return <p className="search-status">{t.noMatchingStocks}</p>;
  }

  return (
    <ul className="search-results" aria-label={t.stockSearchResults}>
      {results.map((stock) => (
        <li key={`${stock.ticker}-${stock.exchange}`}>
          <button type="button" onClick={() => onSelect(stock)}>
            <strong>{stock.ticker}</strong>
            <span>{stock.name}</span>
            <small>{stock.exchange || t.exchangeUnavailable}</small>
          </button>
        </li>
      ))}
    </ul>
  );
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
