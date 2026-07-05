"use client";

import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
  UserDto,
  WatchlistItemDto,
  WatchlistViewMode,
} from "@ai-stock-advisor/shared";
import type { Dictionary } from "../dictionaries";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PaginationControls } from "../components/ui/PaginationControls";
import { Textarea } from "../components/ui/textarea";
import { SortIndicator } from "../components/ui/SortIndicator";
import { CompanyLogo } from "../components/stocks/CompanyLogo";
import { StockCard, TrashIcon } from "../components/watchlist/StockCard";
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
import { getWatchlistTargetPriceSummary } from "../lib/watchlist-target-price";
import { updateProfile } from "../lib/profile-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../lib/stock-format";
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
import { normalizeWatchlistViewMode } from "../lib/watchlist-view-mode";

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
  targetPrice: ({ item }) => item.targetPrice,
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
  const { accessToken, updateUser, user } = useAuth();
  const { language, t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    null,
  );
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRemovalItem, setPendingRemovalItem] =
    useState<WatchlistItemDto | null>(null);
  const watchlistViewMode = normalizeWatchlistViewMode(
    user?.watchlistViewMode,
  );
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
        targetPrice: parseTargetPriceInput(targetPriceInput),
        notes: notesInput.trim() || undefined,
      }),
    onSuccess: async () => {
      setSearchInput("");
      setTargetPriceInput("");
      setNotesInput("");
      setSelectedStock(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWatchlistItem(accessToken ?? "", id),
    onSuccess: async () => {
      setPendingRemovalItem(null);
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const updateViewModeMutation = useMutation({
    mutationFn: (viewMode: WatchlistViewMode) =>
      updateProfile(accessToken ?? "", { watchlistViewMode: viewMode }),
    onMutate: async (viewMode) => {
      await queryClient.cancelQueries({ queryKey: ["profile"] });
      const previousProfile = queryClient.getQueryData<UserDto>(["profile"]);
      const previousUser = user;

      if (previousProfile) {
        queryClient.setQueryData<UserDto>(["profile"], {
          ...previousProfile,
          watchlistViewMode: viewMode,
        });
      }

      if (previousUser) {
        updateUser({
          ...previousUser,
          watchlistViewMode: viewMode,
        });
      }

      return { previousProfile, previousUser };
    },
    onError: (_error, _viewMode, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData<UserDto>(["profile"], context.previousProfile);
      }

      if (context?.previousUser) {
        updateUser(context.previousUser);
      }
    },
    onSuccess: (profile) => {
      queryClient.setQueryData<UserDto>(["profile"], profile);
      updateUser(profile);
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
      queryKey: ["market", "stocks", item.ticker, "candles", "1y"],
      queryFn: () => fetchStockCandles(accessToken ?? "", item.ticker, "1y"),
      enabled: Boolean(accessToken) && watchlistViewMode === "grid",
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

  const formErrorMessage =
    formError ??
    (addMutation.error instanceof Error ? t.addStockError : null);
  const viewModeError =
    updateViewModeMutation.error instanceof Error
      ? t.watchlistViewSaveError
      : null;

  const confirmRemoval = () => {
    if (!pendingRemovalItem) {
      return;
    }

    removeMutation.mutate(pendingRemovalItem.id);
  };

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
            <Label htmlFor="stock-search">{t.tickerOrCompanyName}</Label>
            <Input
              autoComplete="off"
              disabled={addMutation.isPending}
              id="stock-search"
              name="stock-search"
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSelectedStock(null);
                setFormError(null);
              }}
              placeholder={t.stockSearchPlaceholder}
              value={searchInput}
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
          <div className="watchlist-form-meta">
            <div className="profile-field">
              <Label htmlFor="target-price">{t.targetPrice}</Label>
              <Input
                disabled={addMutation.isPending}
                id="target-price"
                inputMode="decimal"
                min="0"
                name="target-price"
                onChange={(event) => setTargetPriceInput(event.target.value)}
                placeholder={t.targetPricePlaceholder}
                step="0.01"
                type="number"
                value={targetPriceInput}
              />
            </div>
            <div className="profile-field">
              <Label htmlFor="watchlist-notes">{t.watchNotes}</Label>
              <Textarea
                disabled={addMutation.isPending}
                id="watchlist-notes"
                maxLength={280}
                name="watchlist-notes"
                onChange={(event) => setNotesInput(event.target.value)}
                placeholder={t.watchNotesPlaceholder}
                rows={3}
                value={notesInput}
              />
            </div>
          </div>
          <button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? t.adding : t.add}
          </button>
        </form>
        {formErrorMessage ? (
          <p className="error-text" role="alert">{formErrorMessage}</p>
        ) : null}
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
              <WatchlistSortButton
                label={t.targetPrice}
                onSort={setSort}
                sort="targetPrice"
                sortState={sortState}
              />
            </div>
            <WatchlistViewSwitcher
              isSaving={updateViewModeMutation.isPending}
              onChange={(viewMode) => {
                if (viewMode !== watchlistViewMode) {
                  updateViewModeMutation.mutate(viewMode);
                }
              }}
              t={t}
              value={watchlistViewMode}
            />
          </div>
        </div>
        {quotesQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.livePricesUnavailable}</p>
        ) : null}
        {viewModeError ? (
          <p className="error-text" role="alert">{viewModeError}</p>
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
            {watchlistViewMode === "grid" ? (
              <div className="watchlist-grid">
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
                    onRemove={() => setPendingRemovalItem(displayItem.item)}
                    profile={displayItem.profile}
                    quote={displayItem.quote}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <WatchlistTable
                displayItems={paginatedDisplayItems}
                isPriceLoading={quotesQuery.isLoading}
                isRemoving={removeMutation.isPending}
                language={language}
                onOpen={(ticker) => setDetailsTicker(ticker)}
                onRemove={setPendingRemovalItem}
                removingItemId={removeMutation.variables}
                t={t}
              />
            )}
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
      {pendingRemovalItem ? (
        <RemoveWatchlistItemModal
          error={removeMutation.error}
          isPending={removeMutation.isPending}
          item={pendingRemovalItem}
          onClose={() => {
            if (!removeMutation.isPending) {
              setPendingRemovalItem(null);
            }
          }}
          onConfirm={confirmRemoval}
          t={t}
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

function WatchlistViewSwitcher({
  isSaving,
  onChange,
  t,
  value,
}: {
  isSaving: boolean;
  onChange: (viewMode: WatchlistViewMode) => void;
  t: Dictionary;
  value: WatchlistViewMode;
}) {
  return (
    <div
      aria-busy={isSaving}
      aria-label={t.watchlistViewOptions}
      className="watchlist-view-switcher"
      role="group"
    >
      <button
        aria-label={t.gridView}
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
        type="button"
      >
        <GridViewIcon />
        <span>{t.gridView}</span>
      </button>
      <button
        aria-label={t.listView}
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        type="button"
      >
        <ListViewIcon />
        <span>{t.listView}</span>
      </button>
    </div>
  );
}

function WatchlistTable({
  displayItems,
  isPriceLoading,
  isRemoving,
  language,
  onOpen,
  onRemove,
  removingItemId,
  t,
}: {
  displayItems: WatchlistDisplayItem[];
  isPriceLoading: boolean;
  isRemoving: boolean;
  language: UserDto["language"];
  onOpen: (ticker: string) => void;
  onRemove: (item: WatchlistItemDto) => void;
  removingItemId?: string;
  t: Dictionary;
}) {
  return (
    <div className="portfolio-table-wrap watchlist-table-wrap">
      <table className="portfolio-table watchlist-table">
        <thead>
          <tr>
            <th>{t.ticker}</th>
            <th>{t.companyName}</th>
            <th>{t.currentPrice}</th>
            <th>{t.dailyChangePercent}</th>
            <th>{t.targetPrice}</th>
            <th className="watchlist-actions-heading">
              <span className="visually-hidden">{t.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((displayItem) => {
            const { item, profile, quote } = displayItem;
            const companyName =
              profile?.name ?? item.companyName ?? t.companyNameNotSet;
            const changeVariant = quote
              ? getChangeVariant(quote.changePercent)
              : "neutral";
            const targetPriceSummary = getWatchlistTargetPriceSummary({
              currentPrice: quote?.currentPrice,
              currency: profile?.currency || quote?.currency || "USD",
              language,
              targetPrice: item.targetPrice,
            });

            return (
              <tr
                className="portfolio-table-row-open watchlist-table-row"
                key={item.id}
                onClick={() => onOpen(item.ticker)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen(item.ticker);
                  }
                }}
                tabIndex={0}
              >
                <td>
                  <div className="stock-table-identity">
                    <CompanyLogo
                      className="company-logo--table"
                      companyName={companyName}
                      logoUrl={profile?.logo}
                      ticker={item.ticker}
                    />
                    <strong>{item.ticker}</strong>
                  </div>
                </td>
                <td>
                  <span className="watchlist-table-company" title={companyName}>
                    {companyName}
                  </span>
                  {item.notes ? (
                    <p className="watchlist-table-notes" title={item.notes}>
                      {item.notes}
                    </p>
                  ) : null}
                </td>
                <td>
                  {isPriceLoading ? (
                    <span className="watchlist-table-status">
                      {t.loadingPrice}
                    </span>
                  ) : quote ? (
                    formatCurrency(
                      quote.currentPrice,
                      profile?.currency || quote.currency || "USD",
                      language,
                    )
                  ) : (
                    <span className="watchlist-table-status">
                      {t.priceUnavailable}
                    </span>
                  )}
                </td>
                <td>
                  {isPriceLoading ? (
                    <span className="watchlist-table-status">
                      {t.loadingPrice}
                    </span>
                  ) : quote ? (
                    <span className={`stock-change stock-change-${changeVariant}`}>
                      {formatPercent(quote.changePercent, language)}
                    </span>
                  ) : (
                    <span className="watchlist-table-status">
                      {t.priceUnavailable}
                    </span>
                  )}
                </td>
                <td>
                  {targetPriceSummary.targetLabel ? (
                    <div className="watchlist-target-cell">
                      <span>{targetPriceSummary.targetLabel}</span>
                      {targetPriceSummary.deltaLabel ? (
                        <strong
                          className={`stock-change stock-change-${targetPriceSummary.variant}`}
                        >
                          {targetPriceSummary.deltaLabel}
                        </strong>
                      ) : null}
                    </div>
                  ) : (
                    <span className="watchlist-table-status">{t.notSet}</span>
                  )}
                </td>
                <td className="watchlist-actions-cell">
                  <button
                    aria-label={`${isRemoving ? t.removing : t.remove} ${item.ticker}`}
                    className="watchlist-table-remove"
                    disabled={isRemoving && removingItemId === item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(item);
                    }}
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RemoveWatchlistItemModal({
  error,
  isPending,
  item,
  onClose,
  onConfirm,
  t,
}: {
  error: Error | null;
  isPending: boolean;
  item: WatchlistItemDto;
  onClose: () => void;
  onConfirm: () => void;
  t: Dictionary;
}) {
  const headingId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    if (dialog) {
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="stock-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-busy={isPending}
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal portfolio-delete-modal watchlist-delete-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={t.close}
          className="stock-modal-close"
          disabled={isPending}
          onClick={onClose}
          type="button"
        >
          X
        </button>
        <div className="stock-modal-header">
          <h2 id={headingId}>{t.removeFromWatchlistTitle}</h2>
        </div>
        <p className="portfolio-delete-modal-message" id={descriptionId}>
          {t.removeFromWatchlistConfirmation.replace("{ticker}", item.ticker)}
        </p>
        <div className="portfolio-modal-actions">
          <Button disabled={isPending} onClick={onClose} variant="outline">
            {t.cancel}
          </Button>
          <Button disabled={isPending} onClick={onConfirm} variant="danger">
            {isPending ? t.removing : t.remove}
          </Button>
        </div>
        {error instanceof Error ? (
          <p className="error-text watchlist-delete-error" role="alert">
            {t.removeStockError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter((element) => element.offsetParent !== null);
}

function GridViewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01" />
      <path d="M4 12h.01" />
      <path d="M4 18h.01" />
    </svg>
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

function parseTargetPriceInput(value: string): number | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number.parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
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
