"use client";

import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import type { Dictionary } from "../dictionaries";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PaginationControls } from "../components/ui/PaginationControls";
import { SortIndicator } from "../components/ui/SortIndicator";
import { StockCard } from "../components/watchlist/StockCard";
import { StockDetailsModal } from "../components/stocks/StockDetailsModal";
import {
  watchlistSortFields,
  type WatchlistSortField,
} from "../lib/page-sort-fields";
import {
  createClientPaginationMeta,
  paginateClientItems,
} from "../lib/client-pagination";
import {
  fetchCompanyProfile,
  fetchMarketQuotes,
  fetchStockCandles,
  searchMarketSymbols,
  type StockChartCandle,
} from "../lib/market-data-api";
import {
  resolveValidPage,
  shouldShowPagination,
} from "../lib/pagination-state";
import type { SortState } from "../lib/table-sorting";
import { sortItems, toggleSortState } from "../lib/table-sorting";
import {
  parsePageParam,
  parseSortParams,
  parseStringParam,
  type QueryParamsReader,
  useUrlState,
} from "../lib/url-state";
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from "../lib/watchlist-api";

const watchlistQueryKey = ["watchlist"] as const;
const tablePageSize = 10;
const watchlistSortAccessors: Record<
  WatchlistSortField,
  (displayItem: WatchlistDisplayItem) => string | number | undefined
> = {
  ticker: ({ item }) => item.ticker,
  currentPrice: ({ quote }) => quote?.currentPrice,
  changePercent: ({ quote }) => quote?.changePercent,
  companyName: ({ item, profile }) =>
    profile?.name ?? item.companyName ?? item.ticker,
};
const watchlistUrlKeys = ["search", "sort", "order", "page"] as const;

interface WatchlistUrlState extends SortState<WatchlistSortField> {
  page: number;
  search: string;
}

function parseWatchlistUrlState(params: QueryParamsReader): WatchlistUrlState {
  const sortState = parseSortParams({
    allowedSorts: watchlistSortFields,
    params,
  });

  return {
    page: parsePageParam(params.get("page")),
    search: parseStringParam(params.get("search")),
    ...sortState,
  };
}

function serializeWatchlistUrlState(
  state: WatchlistUrlState,
): Record<string, string | number | undefined> {
  return {
    search: state.search,
    sort: state.sort,
    order: state.sort ? state.order : undefined,
    page: state.page,
  };
}

interface WatchlistDisplayItem {
  candles?: StockChartCandle[];
  isChartLoading: boolean;
  isChartUnavailable: boolean;
  item: WatchlistItemDto;
  profile?: CompanyProfile;
  quote?: StockQuote;
}

export function WatchlistPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    null,
  );
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), 350);
  const { setState: setUrlState, state: urlState } = useUrlState({
    defaults: { page: 1 },
    managedKeys: watchlistUrlKeys,
    parse: parseWatchlistUrlState,
    serialize: serializeWatchlistUrlState,
  });
  const currentPage = urlState.page;
  const watchlistSearch = urlState.search;
  const sortState: SortState<WatchlistSortField> = useMemo(
    () => ({
      sort: urlState.sort,
      order: urlState.order,
    }),
    [urlState.order, urlState.sort],
  );
  const setCurrentPage = useCallback((page: number | ((currentPage: number) => number)) => {
    setUrlState({
      page: typeof page === "function" ? page(currentPage) : page,
    });
  }, [currentPage, setUrlState]);
  const setSort = useCallback((sort: WatchlistSortField) => {
    const nextSortState = toggleSortState(sortState, sort);

    setUrlState({
      sort: nextSortState.sort,
      order: nextSortState.order,
      page: 1,
    });
  }, [setUrlState, sortState]);

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

  const items = useMemo(() => watchlistQuery.data ?? [], [watchlistQuery.data]);
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
  const sparklineQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["market", "stocks", item.ticker, "candles", "1m"],
      queryFn: () => fetchStockCandles(accessToken ?? "", item.ticker, "1m"),
      select: getRecentSparklineCandles,
      enabled: Boolean(accessToken),
      staleTime: 5 * 60 * 1_000,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });
  const displayItems = useMemo(
    () =>
      items.map((item, index): WatchlistDisplayItem => ({
        candles: sparklineQueries[index]?.data,
        isChartLoading: sparklineQueries[index]?.isLoading ?? false,
        isChartUnavailable: sparklineQueries[index]?.error instanceof Error,
        item,
        profile: profilesByTicker.get(item.ticker),
        quote: quotesByTicker.get(item.ticker),
      })),
    [items, profilesByTicker, quotesByTicker, sparklineQueries],
  );
  const filteredDisplayItems = useMemo(() => {
    const normalizedSearch = watchlistSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return displayItems;
    }

    return displayItems.filter((displayItem) =>
      [
        displayItem.item.ticker,
        displayItem.item.companyName,
        displayItem.profile?.name,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [displayItems, watchlistSearch]);
  const sortedDisplayItems = useMemo(
    () =>
      sortItems({
        accessors: watchlistSortAccessors,
        items: filteredDisplayItems,
        state: sortState,
      }),
    [filteredDisplayItems, sortState],
  );
  const paginationMeta = createClientPaginationMeta({
    page: currentPage,
    limit: tablePageSize,
    totalItems: sortedDisplayItems.length,
  });
  const paginatedDisplayItems = paginateClientItems({
    items: sortedDisplayItems,
    page: currentPage,
    limit: tablePageSize,
  });
  const showPagination = shouldShowPagination(paginationMeta, tablePageSize);

  useEffect(() => {
    const validPage = resolveValidPage(currentPage, paginationMeta);

    if (validPage !== currentPage) {
      setCurrentPage(validPage);
    }
  }, [currentPage, paginationMeta, setCurrentPage]);

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
        <div className="section-heading watchlist-heading">
          <h2 id="watchlist-heading">{t.yourWatchlist}</h2>
          <div className="watchlist-controls">
            <div className="profile-field table-search-field">
              <Label htmlFor="watchlist-search">{t.tickerOrCompanyName}</Label>
              <Input
                id="watchlist-search"
                onChange={(event) =>
                  setUrlState({
                    search: event.target.value,
                    page: 1,
                  })
                }
                placeholder={t.stockSearchPlaceholder}
                value={watchlistSearch}
              />
            </div>
            <div className="watchlist-sort-controls" aria-label={t.sortOptions}>
              <WatchlistSortButton
                label={t.ticker}
                onSort={setSort}
                sort="ticker"
                sortState={sortState}
              />
              <WatchlistSortButton
                label={t.currentPrice}
                onSort={setSort}
                sort="currentPrice"
                sortState={sortState}
              />
              <WatchlistSortButton
                label={t.dailyChangePercent}
                onSort={setSort}
                sort="changePercent"
                sortState={sortState}
              />
              <WatchlistSortButton
                label={t.companyName}
                onSort={setSort}
                sort="companyName"
                sortState={sortState}
              />
            </div>
          </div>
        </div>
        {quotesQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.livePricesUnavailable}</p>
        ) : null}

        {watchlistQuery.isLoading ? (
          <p role="status">{t.loadingWatchlist}</p>
        ) : watchlistQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.watchlistLoadError}</p>
        ) : paginatedDisplayItems.length === 0 ? (
          <EmptyState
            description={
              watchlistSearch.trim() ? t.noMatchingStocks : t.watchlistEmpty
            }
            title={watchlistSearch.trim() ? t.noMatchingStocks : t.noStocksYet}
          />
        ) : (
          <>
            <div className="watchlist-list">
              {paginatedDisplayItems.map((displayItem) => (
                <StockCard
                  candles={displayItem.candles}
                  isChartLoading={displayItem.isChartLoading}
                  isChartUnavailable={displayItem.isChartUnavailable}
                  isPriceLoading={quotesQuery.isLoading}
                  isRemoving={
                    removeMutation.isPending &&
                    removeMutation.variables === displayItem.item.id
                  }
                  item={displayItem.item}
                  key={displayItem.item.id}
                  language={language}
                  onOpen={() => setDetailsTicker(displayItem.item.ticker)}
                  onRemove={() => removeMutation.mutate(displayItem.item.id)}
                  profile={displayItem.profile}
                  quote={displayItem.quote}
                  t={t}
                />
              ))}
            </div>
            {showPagination ? (
              <PaginationControls
                ariaLabel={t.paginationNavigation}
                currentPage={currentPage}
                isBusy={watchlistQuery.isFetching || quotesQuery.isFetching}
                nextLabel={t.paginationNext}
                onNext={() => setCurrentPage((page) => page + 1)}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                pageLabel={t.paginationPageIndicator}
                previousLabel={t.paginationPrevious}
                totalPages={paginationMeta.totalPages}
              />
            ) : null}
          </>
        )}
      </section>
      {detailsTicker ? (
        <StockDetailsModal
          onClose={() => setDetailsTicker(null)}
          open={Boolean(detailsTicker)}
          ticker={detailsTicker}
        />
      ) : null}
    </main>
  );
}

function WatchlistSortButton({
  label,
  onSort,
  sort,
  sortState,
}: {
  label: string;
  onSort: (sort: WatchlistSortField) => void;
  sort: WatchlistSortField;
  sortState: SortState<WatchlistSortField>;
}) {
  const isActive = sortState.sort === sort;

  return (
    <button
      aria-pressed={isActive}
      className="watchlist-sort-button"
      onClick={() => onSort(sort)}
      type="button"
    >
      <span>{label}</span>
      <SortIndicator order={isActive ? sortState.order : undefined} />
    </button>
  );
}

function getRecentSparklineCandles(
  candles: StockChartCandle[],
): StockChartCandle[] {
  return candles.slice(-40);
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
