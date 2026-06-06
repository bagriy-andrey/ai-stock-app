"use client";

import type {
  PortfolioTransactionDto,
  PortfolioTransactionType,
  ProfileLanguage,
  UpdatePortfolioTransactionRequest,
} from "@ai-stock-advisor/shared";
import {
  type QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import type { FocusEvent, FormEvent } from "react";
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
import { Textarea } from "../components/ui/textarea";
import { SortableHeader } from "../components/ui/SortableHeader";
import type { Dictionary } from "../dictionaries";
import {
  canAcceptPurchaseNumberInput,
  defaultPurchaseCurrency,
  editableTransactionTypes,
  getInitialPurchaseCurrency,
  isEditableTransactionType,
  isSupportedPurchaseCurrency,
  normalizePurchaseNumberInput,
  purchaseNotesMaxLength,
  supportedPurchaseCurrencies,
  toUpdatePortfolioTransactionRequest,
  validateEditTransactionForm,
  type EditTransactionField,
  type EditTransactionValidationMessages,
  type PurchaseCurrency,
} from "../lib/add-purchase-validation";
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
const editableTransactionTypeOptions = [...editableTransactionTypes];
const transactionCurrencyOptions = supportedPurchaseCurrencies.map((currency) => ({
  label: currency,
  value: currency,
}));
const companyLogoBaseUrl = "https://financialmodelingprep.com/image-stock";
const tablePageSize = 10;
const transactionSortAccessors: Record<
  TransactionSortField,
  (transaction: PortfolioTransactionDto) => string | number | Date
> = {
  name: (transaction) => transaction.companyName || transaction.ticker,
  type: (transaction) => transaction.type,
  quantity: (transaction) => transaction.quantity,
  price: (transaction) => transaction.price,
  totalValue: (transaction) => getTransactionTotalValue(transaction),
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
const portfolioQueryKey = ["portfolio"] as const;
const portfolioAllocationQueryKey = ["portfolio", "allocation"] as const;
const portfolioPerformanceQueryKey = ["portfolio", "performance"] as const;
const transactionsQueryKeyPrefix = ["transactions"] as const;

async function invalidatePortfolioAndTransactions(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ exact: true, queryKey: portfolioQueryKey }),
    queryClient.invalidateQueries({ queryKey: portfolioAllocationQueryKey }),
    queryClient.invalidateQueries({ queryKey: portfolioPerformanceQueryKey }),
    queryClient.invalidateQueries({ queryKey: transactionsQueryKeyPrefix }),
  ]);
}

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
      setStatusMessage(t.portfolioActionSuccess);
      if (!transactionMatchesFilters(updatedTransaction, queryState)) {
        setCurrentPage((page) =>
          getPageAfterRemovingCurrentItem({
            currentPage: page,
            currentItemsCount: transactions.length,
            meta: paginationMeta,
          }),
        );
      }
      await invalidatePortfolioAndTransactions(queryClient);
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
      await invalidatePortfolioAndTransactions(queryClient);
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
              onDelete={(transaction) => {
                setStatusMessage(null);
                setDeletingTransaction(transaction);
              }}
              onEdit={(transaction) => {
                setStatusMessage(null);
                setEditingTransaction(transaction);
              }}
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
        {statusMessage ? (
          <p className="app-toast" role="status">
            {statusMessage}
          </p>
        ) : null}
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
              label={t.name}
              onSort={onSort}
              sort="name"
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
            <SortableHeader
              label={t.totalValue}
              onSort={onSort}
              sort="totalValue"
              sortState={sortState}
            />
            <SortableHeader
              label={t.date}
              onSort={onSort}
              sort="date"
              sortState={sortState}
            />
            <th className="transactions-actions-heading">
              <span className="visually-hidden">{t.actions}</span>
            </th>
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
              <td>
                {formatCurrency(
                  getTransactionTotalValue(transaction),
                  transaction.currency || "USD",
                  language,
                )}
              </td>
              <td>{formatTransactionDate(transaction.transactionDate, language)}</td>
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

function getTransactionTotalValue(transaction: PortfolioTransactionDto): number {
  return transaction.quantity * transaction.price;
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
  const formId = useId();
  const formErrorId = useId();
  const serverErrorId = useId();
  const [type, setType] = useState<string>(
    isEditableTransactionType(transaction.type) ? transaction.type : "",
  );
  const [quantity, setQuantity] = useState(String(transaction.quantity));
  const [price, setPrice] = useState(String(transaction.price));
  const [currency, setCurrency] = useState<PurchaseCurrency>(
    getInitialPurchaseCurrency(transaction.currency || defaultPurchaseCurrency),
  );
  const [transactionDate, setTransactionDate] = useState(
    formatDateTimeLocalValue(new Date(transaction.transactionDate)),
  );
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<EditTransactionField, boolean>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const latestTransactionDate = getCurrentLocalDateTime();
  const validationMessages = useMemo(() => getEditTransactionValidationMessages(t), [t]);
  const formValues = useMemo(
    () => ({
      companyName: transaction.companyName,
      currency,
      notes,
      price,
      quantity,
      ticker: transaction.ticker,
      transactionDate,
      type,
    }),
    [
      currency,
      notes,
      price,
      quantity,
      transaction.companyName,
      transaction.ticker,
      transactionDate,
      type,
    ],
  );
  const validation = useMemo(
    () => validateEditTransactionForm(formValues, validationMessages),
    [formValues, validationMessages],
  );
  const fieldErrors = validation.errors;
  const isFormValid = validation.success;
  const submissionError = error instanceof Error ? error.message : null;

  useModalEffects(onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if (!validation.success) {
      setFormError(t.editTransactionFormValidationError);
      return;
    }

    setFormError(null);
    onSubmit(toUpdatePortfolioTransactionRequest(validation.data));
  };

  const markTouched = (field: EditTransactionField) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const normalizeNumericField = (
    event: FocusEvent<HTMLInputElement>,
    setValue: (value: string) => void,
  ) => {
    setValue(normalizePurchaseNumberInput(event.target.value));
  };

  const showFieldError = (field: EditTransactionField) =>
    Boolean(fieldErrors[field] && (touchedFields[field] || formError));
  const getFieldError = (field: EditTransactionField) =>
    showFieldError(field) ? fieldErrors[field] : undefined;

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
        aria-describedby={`${formError ? formErrorId : ""} ${
          submissionError ? serverErrorId : ""
        }`.trim() || undefined}
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal"
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
          <h2 id={headingId}>{t.editTransaction}</h2>
        </div>
        <form
          className="portfolio-form"
          id={formId}
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="profile-field">
            <Label htmlFor="transaction-edit-ticker">{t.name}</Label>
            <Input
              disabled
              id="transaction-edit-ticker"
              value={transaction.ticker}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transaction-edit-company">{t.companyName}</Label>
            <Input
              disabled
              id="transaction-edit-company"
              value={transaction.companyName}
            />
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="transaction-edit-type" label={t.transactionType} />
            <Select
              aria-describedby={
                getFieldError("type") ? "transaction-edit-type-error" : undefined
              }
              aria-invalid={showFieldError("type")}
              className={showFieldError("type") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-type"
              onBlur={() => markTouched("type")}
              onChange={(event) => {
                setType(event.target.value);
                setFormError(null);
              }}
              required
              value={type}
            >
              <option disabled value="">
                {t.selectTransaction}
              </option>
              {editableTransactionTypeOptions.map((transactionType) => (
                <option key={transactionType} value={transactionType}>
                  {transactionType}
                </option>
              ))}
            </Select>
            <FieldError
              id="transaction-edit-type-error"
              message={getFieldError("type")}
            />
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="transaction-edit-quantity" label={t.quantity} />
            <Input
              aria-describedby={
                getFieldError("quantity")
                  ? "transaction-edit-quantity-error"
                  : undefined
              }
              aria-invalid={showFieldError("quantity")}
              className={showFieldError("quantity") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-quantity"
              inputMode="decimal"
              onBlur={(event) => {
                markTouched("quantity");
                normalizeNumericField(event, setQuantity);
              }}
              onChange={(event) => {
                if (canAcceptPurchaseNumberInput(event.target.value)) {
                  setQuantity(event.target.value);
                  setFormError(null);
                }
              }}
              required
              type="text"
              value={quantity}
            />
            <FieldError
              id="transaction-edit-quantity-error"
              message={getFieldError("quantity")}
            />
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="transaction-edit-price" label={t.price} />
            <Input
              aria-describedby={
                getFieldError("price") ? "transaction-edit-price-error" : undefined
              }
              aria-invalid={showFieldError("price")}
              className={showFieldError("price") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-price"
              inputMode="decimal"
              onBlur={(event) => {
                markTouched("price");
                normalizeNumericField(event, setPrice);
              }}
              onChange={(event) => {
                if (canAcceptPurchaseNumberInput(event.target.value)) {
                  setPrice(event.target.value);
                  setFormError(null);
                }
              }}
              required
              type="text"
              value={price}
            />
            <FieldError
              id="transaction-edit-price-error"
              message={getFieldError("price")}
            />
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="transaction-edit-currency" label={t.currency} />
            <Select
              aria-describedby={
                getFieldError("currency")
                  ? "transaction-edit-currency-error"
                  : undefined
              }
              aria-invalid={showFieldError("currency")}
              className={showFieldError("currency") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-currency"
              onBlur={() => markTouched("currency")}
              onChange={(event) => {
                if (isSupportedPurchaseCurrency(event.target.value)) {
                  setCurrency(event.target.value);
                }
                setFormError(null);
              }}
              required
              value={currency}
            >
              {transactionCurrencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError
              id="transaction-edit-currency-error"
              message={getFieldError("currency")}
            />
          </div>
          <div className="profile-field profile-field-full">
            <RequiredLabel htmlFor="transaction-edit-date" label={t.transactionDate} />
            <Input
              aria-describedby={
                getFieldError("transactionDate")
                  ? "transaction-edit-date-error"
                  : undefined
              }
              aria-invalid={showFieldError("transactionDate")}
              className={showFieldError("transactionDate") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-date"
              max={latestTransactionDate}
              onBlur={() => markTouched("transactionDate")}
              onChange={(event) => {
                setTransactionDate(event.target.value);
                setFormError(null);
              }}
              required
              step="60"
              type="datetime-local"
              value={transactionDate}
            />
            <FieldError
              id="transaction-edit-date-error"
              message={getFieldError("transactionDate")}
            />
          </div>
          <div className="profile-field profile-field-full">
            <Label htmlFor="transaction-edit-notes">{t.notes}</Label>
            <Textarea
              aria-describedby={
                getFieldError("notes")
                  ? "transaction-edit-notes-error transaction-edit-notes-help"
                  : "transaction-edit-notes-help"
              }
              aria-invalid={showFieldError("notes")}
              className={showFieldError("notes") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="transaction-edit-notes"
              maxLength={purchaseNotesMaxLength}
              onBlur={() => markTouched("notes")}
              onChange={(event) => {
                setNotes(event.target.value);
                setFormError(null);
              }}
              rows={4}
              value={notes}
            />
            <small className="portfolio-field-status" id="transaction-edit-notes-help">
              {t.notesMaxLengthHelp.replace(
                "{count}",
                String(Math.max(0, purchaseNotesMaxLength - notes.length)),
              )}
            </small>
            <FieldError
              id="transaction-edit-notes-error"
              message={getFieldError("notes")}
            />
          </div>
        </form>
        <div className="portfolio-modal-actions">
          <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
            {t.cancel}
          </Button>
          <Button
            disabled={!isFormValid || isPending}
            form={formId}
            type="submit"
          >
            {isPending ? t.saving : t.saveTransaction}
          </Button>
        </div>
        {formError ? (
          <p className="error-text" id={formErrorId} role="alert">
            {formError}
          </p>
        ) : null}
        {submissionError ? (
          <p className="error-text" id={serverErrorId} role="alert">
            {t.transactionSaveError} {submissionError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function RequiredLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <Label htmlFor={htmlFor}>
      {label} <span aria-hidden="true" className="required-indicator">*</span>
      <span className="visually-hidden"> required</span>
    </Label>
  );
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  return (
    <small
      aria-hidden={message ? undefined : true}
      className="field-error"
      id={id}
      role={message ? "alert" : undefined}
    >
      {message}
    </small>
  );
}

function getEditTransactionValidationMessages(
  t: Dictionary,
): EditTransactionValidationMessages {
  return {
    currencyRequiredError: t.currencyRequiredError,
    currencyUnsupportedError: t.currencyUnsupportedError,
    futureTransactionDateError: t.futureTransactionDateError,
    notesDangerousError: t.notesDangerousError,
    notesMaxLengthError: t.notesMaxLengthError,
    priceInvalidNumberError: t.priceInvalidNumberError,
    priceRangeError: t.priceRangeError,
    priceRequiredError: t.priceRequiredError,
    quantityInvalidNumberError: t.quantityInvalidNumberError,
    quantityRangeError: t.quantityRangeError,
    quantityRequiredError: t.quantityRequiredError,
    stockSelectionRequiredError: t.stockSelectionRequiredError,
    transactionDateRequiredError: t.transactionDateRequiredError,
    transactionTypeRequiredError: t.transactionTypeRequiredError,
  };
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
  }).format(new Date(value));
}

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
