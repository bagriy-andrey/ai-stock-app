"use client";

import type {
  PortfolioTransactionDto,
  PortfolioTransactionType,
  ProfileLanguage,
  UpdatePortfolioTransactionRequest,
} from "@ai-stock-advisor/shared";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { CompanyLogoAvatar } from "../components/stocks/CompanyLogo";
import { StockDetailsModal } from "../components/stocks/StockDetailsModal";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/EmptyState";
import { IconTooltipButton } from "../components/ui/IconTooltipButton";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PaginationControls } from "../components/ui/PaginationControls";
import { Select } from "../components/ui/select";
import { SortableHeader } from "../components/ui/SortableHeader";
import type { Dictionary } from "../dictionaries";
import {
  createClientPaginationMeta,
  paginateClientItems,
} from "../lib/client-pagination";
import {
  transactionSortFields,
  type TransactionSortField,
} from "../lib/page-sort-fields";
import {
  getPageAfterRemovingCurrentItem,
  resolveValidPage,
  shouldShowPagination,
} from "../lib/pagination-state";
import {
  fetchAllTransactions,
  removeTransaction,
  updateTransaction,
} from "../lib/transactions-api";
import {
  buildTransactionsListQueryKey,
  buildTransactionsQueryState,
  getPageAfterTransactionsFilterChange,
  hasTransactionFilters,
  parseTransactionTypeFilter,
  transactionMatchesFilters,
  transactionTypeFilters,
  toTransactionFilters,
} from "../lib/transactions-query-state";
import { formatCurrency } from "../lib/stock-format";
import type { SortState } from "../lib/table-sorting";
import { sortItems, toggleSortState } from "../lib/table-sorting";
import {
  parsePageParam,
  parseSortParams,
  parseStringParam,
  type QueryParamsReader,
  useUrlState,
} from "../lib/url-state";

const transactionTypes: PortfolioTransactionType[] = [...transactionTypeFilters];
const companyLogoBaseUrl = "https://financialmodelingprep.com/image-stock";
const tablePageSize = 10;
const transactionSortAccessors: Record<
  TransactionSortField,
  (transaction: PortfolioTransactionDto) => string | number | Date
> = {
  ticker: (transaction) => transaction.ticker,
  type: (transaction) => transaction.type,
  quantity: (transaction) => transaction.quantity,
  price: (transaction) => transaction.price,
  date: (transaction) => new Date(transaction.transactionDate),
};
const transactionsUrlKeys = [
  "ticker",
  "type",
  "fromDate",
  "toDate",
  "sort",
  "order",
  "page",
] as const;

interface TransactionsUrlState extends SortState<TransactionSortField> {
  fromDate: string;
  page: number;
  ticker: string;
  toDate: string;
  type?: PortfolioTransactionType;
}

function parseTransactionsUrlState(
  params: QueryParamsReader,
): TransactionsUrlState {
  const sortState = parseSortParams({
    allowedSorts: transactionSortFields,
    params,
  });

  return {
    fromDate: parseStringParam(params.get("fromDate")),
    page: parsePageParam(params.get("page")),
    ticker: parseStringParam(params.get("ticker")).toUpperCase(),
    toDate: parseStringParam(params.get("toDate")),
    type: parseTransactionTypeFilter(params.get("type")),
    ...sortState,
  };
}

function serializeTransactionsUrlState(
  state: TransactionsUrlState,
): Record<string, string | number | undefined> {
  return {
    ticker: state.ticker,
    type: state.type?.toLowerCase(),
    fromDate: state.fromDate,
    toDate: state.toDate,
    sort: state.sort,
    order: state.sort ? state.order : undefined,
    page: state.page,
  };
}

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [editingTransaction, setEditingTransaction] =
    useState<PortfolioTransactionDto | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<PortfolioTransactionDto | null>(null);
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
  const { setState: setUrlState, state: urlState } = useUrlState({
    defaults: { page: 1 },
    managedKeys: transactionsUrlKeys,
    parse: parseTransactionsUrlState,
    serialize: serializeTransactionsUrlState,
  });
  const currentPage = urlState.page;
  const fromDate = urlState.fromDate;
  const tickerFilter = urlState.ticker;
  const toDate = urlState.toDate;
  const typeFilter = urlState.type ?? "";
  const sortState: SortState<TransactionSortField> = useMemo(
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
  const setSort = useCallback((sort: TransactionSortField) => {
    const nextSortState = toggleSortState(sortState, sort);

    setUrlState({
      sort: nextSortState.sort,
      order: nextSortState.order,
      page: getPageAfterTransactionsFilterChange(),
    });
  }, [setUrlState, sortState]);
  const queryState = useMemo(
    () =>
      buildTransactionsQueryState({
        page: currentPage,
        limit: tablePageSize,
        ticker: tickerFilter,
        type: typeFilter,
        fromDate,
        toDate,
      }),
    [currentPage, fromDate, tickerFilter, toDate, typeFilter],
  );
  const hasFilters = hasTransactionFilters(queryState);
  const transactionsQueryKey = buildTransactionsListQueryKey(queryState);
  const transactionsQuery = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: () =>
      fetchAllTransactions(accessToken ?? "", toTransactionFilters(queryState)),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const sortedTransactions = useMemo(
    () =>
      sortItems({
        accessors: transactionSortAccessors,
        items: transactionsQuery.data?.items ?? [],
        state: sortState,
      }),
    [sortState, transactionsQuery.data?.items],
  );
  const paginationMeta = createClientPaginationMeta({
    page: currentPage,
    limit: tablePageSize,
    totalItems: sortedTransactions.length,
  });
  const transactions = paginateClientItems({
    items: sortedTransactions,
    page: currentPage,
    limit: tablePageSize,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePortfolioTransactionRequest;
    }) => updateTransaction(accessToken ?? "", id, input),
    onSuccess: async (updatedTransaction) => {
      setEditingTransaction(null);
      if (!transactionMatchesFilters(updatedTransaction, queryState)) {
        setCurrentPage((page) =>
          getPageAfterRemovingCurrentItem({
            currentPage: page,
            currentItemsCount: transactions.length,
            meta: paginationMeta,
          }),
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeTransaction(accessToken ?? "", id),
    onSuccess: async () => {
      setDeletingTransaction(null);
      setCurrentPage((page) =>
        getPageAfterRemovingCurrentItem({
          currentPage: page,
          currentItemsCount: transactions.length,
          meta: paginationMeta,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  const showPagination = shouldShowPagination(paginationMeta, tablePageSize);

  useEffect(() => {
    const validPage = resolveValidPage(currentPage, paginationMeta);

    if (validPage !== currentPage) {
      setCurrentPage(validPage);
    }
  }, [currentPage, paginationMeta, setCurrentPage]);

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">{t.transactions}</p>
        <h1>{t.transactionsTitle}</h1>
        <p className="subtitle">{t.transactionsSubtitle}</p>
      </header>

      <section aria-labelledby="transactions-filter-heading" className="page-section">
        <div className="section-heading">
          <div>
            <h2 id="transactions-filter-heading">{t.transactionFilters}</h2>
            <p>{t.transactionFiltersSubtitle}</p>
          </div>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setUrlState({
                  ticker: "",
                  type: undefined,
                  fromDate: "",
                  toDate: "",
                  page: getPageAfterTransactionsFilterChange(),
                });
              }}
            >
              {t.clearFilters}
            </Button>
          ) : null}
        </div>
        <div className="transactions-filter-form">
          <div className="profile-field">
            <Label htmlFor="transactions-ticker-filter">{t.searchByTicker}</Label>
            <Input
              id="transactions-ticker-filter"
              onChange={(event) => {
                setUrlState({
                  ticker: event.target.value,
                  page: getPageAfterTransactionsFilterChange(),
                });
              }}
              placeholder="AAPL"
              value={tickerFilter}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transactions-type-filter">{t.transactionType}</Label>
            <Select
              id="transactions-type-filter"
              onChange={(event) =>
                setUrlState({
                  type: parseTransactionTypeFilter(event.target.value),
                  page: getPageAfterTransactionsFilterChange(),
                })
              }
              value={typeFilter}
            >
              <option value="">{t.allTypes}</option>
              {transactionTypes.map((transactionType) => (
                <option key={transactionType} value={transactionType}>
                  {transactionType}
                </option>
              ))}
            </Select>
          </div>
          <div className="profile-field">
            <Label htmlFor="transactions-from-date">{t.fromDate}</Label>
            <Input
              id="transactions-from-date"
              onChange={(event) => {
                setUrlState({
                  fromDate: event.target.value,
                  page: getPageAfterTransactionsFilterChange(),
                });
              }}
              type="date"
              value={fromDate}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transactions-to-date">{t.toDate}</Label>
            <Input
              id="transactions-to-date"
              onChange={(event) => {
                setUrlState({
                  toDate: event.target.value,
                  page: getPageAfterTransactionsFilterChange(),
                });
              }}
              type="date"
              value={toDate}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="transactions-list-heading" className="page-section">
        <h2 id="transactions-list-heading">{t.transactionHistory}</h2>
        {transactionsQuery.isLoading ? (
          <p role="status">{t.loadingTransactions}</p>
        ) : transactionsQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.transactionsLoadError}</p>
        ) : transactions.length === 0 ? (
          <EmptyState
            description={hasFilters ? t.transactionsFilteredEmpty : t.transactionsEmpty}
            title={t.noTransactionsYet}
          />
        ) : (
          <>
            <TransactionsTable
              language={language}
              onDelete={setDeletingTransaction}
              onEdit={setEditingTransaction}
              onOpenStock={setDetailsTicker}
              onSort={setSort}
              sortState={sortState}
              t={t}
              transactions={transactions}
            />
            {showPagination && paginationMeta ? (
              <PaginationControls
                ariaLabel={t.paginationNavigation}
                currentPage={currentPage}
                isBusy={transactionsQuery.isFetching}
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

      {editingTransaction ? (
        <TransactionEditModal
          error={updateMutation.error}
          isPending={updateMutation.isPending}
          onClose={() => setEditingTransaction(null)}
          onSubmit={(input) =>
            updateMutation.mutate({ id: editingTransaction.id, input })
          }
          t={t}
          transaction={editingTransaction}
        />
      ) : null}
      {deletingTransaction ? (
        <TransactionDeleteModal
          error={removeMutation.error}
          isPending={removeMutation.isPending}
          onClose={() => setDeletingTransaction(null)}
          onConfirm={() => removeMutation.mutate(deletingTransaction.id)}
          t={t}
          transaction={deletingTransaction}
        />
      ) : null}
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

function TransactionsTable({
  language,
  transactions,
  t,
  onDelete,
  onEdit,
  onOpenStock,
  onSort,
  sortState,
}: {
  language: ProfileLanguage;
  transactions: PortfolioTransactionDto[];
  t: Dictionary;
  onDelete: (transaction: PortfolioTransactionDto) => void;
  onEdit: (transaction: PortfolioTransactionDto) => void;
  onOpenStock: (ticker: string) => void;
  onSort: (sort: TransactionSortField) => void;
  sortState: SortState<TransactionSortField>;
}) {
  return (
    <div className="portfolio-table-wrap transactions-table-wrap">
      <table className="portfolio-table transactions-table">
        <thead>
          <tr>
            <SortableHeader
              label={t.ticker}
              onSort={onSort}
              sort="ticker"
              sortState={sortState}
            />
            <SortableHeader
              label={t.transactionType}
              onSort={onSort}
              sort="type"
              sortState={sortState}
            />
            <SortableHeader
              label={t.quantity}
              onSort={onSort}
              sort="quantity"
              sortState={sortState}
            />
            <SortableHeader
              label={t.price}
              onSort={onSort}
              sort="price"
              sortState={sortState}
            />
            <th>{t.currency}</th>
            <SortableHeader
              label={t.transactionDate}
              onSort={onSort}
              sort="date"
              sortState={sortState}
            />
            <th>{t.notes}</th>
            <th className="transactions-actions-heading">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr className="transactions-table-row" key={transaction.id}>
              <td>
                <button
                  aria-label={`${t.stockDetails}: ${transaction.ticker}, ${transaction.companyName}`}
                  className="transaction-stock-open"
                  onClick={() => onOpenStock(transaction.ticker)}
                  type="button"
                >
                  <CompanyLogoAvatar
                    className="company-logo--table company-logo--transaction"
                    companyName={transaction.companyName}
                    logoUrl={getTransactionCompanyLogoUrl(transaction.ticker)}
                    ticker={transaction.ticker}
                  />
                  <span className="stock-table-identity-text">
                    <strong>{transaction.ticker}</strong>
                    <small title={transaction.companyName}>{transaction.companyName}</small>
                  </span>
                </button>
              </td>
              <td>
                <span className={`transaction-type-badge transaction-type-${transaction.type.toLowerCase()}`}>
                  {transaction.type}
                </span>
              </td>
              <td>{formatNumber(transaction.quantity, language)}</td>
              <td>{formatCurrency(transaction.price, transaction.currency, language)}</td>
              <td>{transaction.currency}</td>
              <td>{formatTransactionDate(transaction.transactionDate, language)}</td>
              <td className="transactions-notes-cell">
                {transaction.notes ? transaction.notes : t.notesUnavailable}
              </td>
              <td className="transactions-actions-cell">
                <div className="portfolio-row-actions">
                  <IconTooltipButton
                    aria-label={t.editTransaction}
                    className="portfolio-row-icon-button"
                    tooltip={t.editTransaction}
                    type="button"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil aria-hidden="true" size={16} strokeWidth={2.2} />
                  </IconTooltipButton>
                  <IconTooltipButton
                    aria-label={t.deleteTransaction}
                    className="portfolio-row-icon-button transactions-row-icon-button-danger"
                    tooltip={t.deleteTransaction}
                    type="button"
                    onClick={() => onDelete(transaction)}
                  >
                    <Trash2 aria-hidden="true" size={16} strokeWidth={2.2} />
                  </IconTooltipButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getTransactionCompanyLogoUrl(ticker: string): string {
  const normalizedTicker = ticker.trim().toUpperCase();

  return `${companyLogoBaseUrl}/${encodeURIComponent(normalizedTicker)}.png`;
}

function TransactionEditModal({
  error,
  isPending,
  transaction,
  t,
  onClose,
  onSubmit,
}: {
  error: Error | null;
  isPending: boolean;
  transaction: PortfolioTransactionDto;
  t: Dictionary;
  onClose: () => void;
  onSubmit: (input: UpdatePortfolioTransactionRequest) => void;
}) {
  const headingId = useId();
  const [ticker, setTicker] = useState(transaction.ticker);
  const [companyName, setCompanyName] = useState(transaction.companyName);
  const [type, setType] = useState<PortfolioTransactionType>(transaction.type);
  const [quantity, setQuantity] = useState(String(transaction.quantity));
  const [price, setPrice] = useState(String(transaction.price));
  const [currency, setCurrency] = useState(transaction.currency);
  const [transactionDate, setTransactionDate] = useState(
    formatDateTimeLocalValue(new Date(transaction.transactionDate)),
  );
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const latestTransactionDate = getCurrentLocalDateTime();

  useModalEffects(onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedTransactionDate = new Date(transactionDate);

    if (
      Number.isNaN(parsedTransactionDate.getTime()) ||
      parsedTransactionDate.getTime() > Date.now()
    ) {
      setFormError(t.futureTransactionDateError);
      return;
    }

    onSubmit({
      ticker,
      companyName,
      type,
      quantity: Number(quantity),
      price: Number(price),
      currency,
      transactionDate: parsedTransactionDate.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="stock-modal-backdrop">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal"
        role="dialog"
      >
        <h2 id={headingId}>{t.editTransaction}</h2>
        <form className="portfolio-form" onSubmit={handleSubmit}>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-ticker">{t.ticker}</Label>
            <Input
              id="transaction-edit-ticker"
              maxLength={10}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              required
              value={ticker}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-company">{t.companyName}</Label>
            <Input
              id="transaction-edit-company"
              onChange={(event) => setCompanyName(event.target.value)}
              required
              value={companyName}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-type">{t.transactionType}</Label>
            <Select
              id="transaction-edit-type"
              onChange={(event) => setType(event.target.value as PortfolioTransactionType)}
              value={type}
            >
              {transactionTypes.map((transactionType) => (
                <option key={transactionType} value={transactionType}>
                  {transactionType}
                </option>
              ))}
            </Select>
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-quantity">{t.quantity}</Label>
            <Input
              id="transaction-edit-quantity"
              min="0.00000001"
              onChange={(event) => setQuantity(event.target.value)}
              required
              step="any"
              type="number"
              value={quantity}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-price">{t.price}</Label>
            <Input
              id="transaction-edit-price"
              min="0.00000001"
              onChange={(event) => setPrice(event.target.value)}
              required
              step="any"
              type="number"
              value={price}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-currency">{t.currency}</Label>
            <Input
              id="transaction-edit-currency"
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              value={currency}
            />
          </div>
          <div className="profile-field profile-field-full">
            <Label htmlFor="transaction-edit-date">{t.transactionDate}</Label>
            <Input
              id="transaction-edit-date"
              max={latestTransactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              required
              step="60"
              type="datetime-local"
              value={transactionDate}
            />
          </div>
          <div className="profile-field profile-field-full">
            <Label htmlFor="transaction-edit-notes">{t.notes}</Label>
            <Input
              id="transaction-edit-notes"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </div>
          <div className="portfolio-modal-actions profile-field-full">
            <Button disabled={isPending} type="submit">
              {isPending ? t.saving : t.saveTransaction}
            </Button>
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              {t.cancel}
            </Button>
          </div>
        </form>
        {formError ? <p className="error-text" role="alert">{formError}</p> : null}
        {error instanceof Error ? (
          <p className="error-text" role="alert">{t.transactionSaveError}</p>
        ) : null}
      </section>
    </div>
  );
}

function TransactionDeleteModal({
  error,
  isPending,
  transaction,
  t,
  onClose,
  onConfirm,
}: {
  error: Error | null;
  isPending: boolean;
  transaction: PortfolioTransactionDto;
  t: Dictionary;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const headingId = useId();
  const descriptionId = useId();
  useModalEffects(onClose);

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
        aria-describedby={descriptionId}
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal portfolio-delete-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label={t.close}
          className="stock-modal-close"
          onClick={onClose}
          type="button"
        >
          X
        </button>
        <div className="stock-modal-header">
          <h2 id={headingId}>{t.deleteTransaction}</h2>
        </div>
        <p className="portfolio-delete-modal-message" id={descriptionId}>
          {t.deleteTransactionConfirmation.replace("{ticker}", transaction.ticker)}
        </p>
        <div className="portfolio-modal-actions">
          <Button disabled={isPending} onClick={onClose} variant="outline">
            {t.cancel}
          </Button>
          <Button disabled={isPending} onClick={onConfirm} variant="danger">
            {isPending ? t.deleting : t.delete}
          </Button>
        </div>
        {error instanceof Error ? (
          <p className="error-text" role="alert">{t.transactionDeleteError}</p>
        ) : null}
      </section>
    </div>
  );
}

function useModalEffects(onClose: () => void): void {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
}

function formatNumber(value: number, language: ProfileLanguage): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 6,
  }).format(value);
}

function formatTransactionDate(
  value: string,
  language: ProfileLanguage,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
