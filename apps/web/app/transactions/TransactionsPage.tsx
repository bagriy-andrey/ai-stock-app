"use client";

import type {
  PortfolioTransactionDto,
  PortfolioTransactionType,
  ProfileLanguage,
  TransactionFilters,
  UpdatePortfolioTransactionRequest,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import type { Dictionary } from "../dictionaries";
import {
  fetchTransactions,
  removeTransaction,
  updateTransaction,
} from "../lib/transactions-api";
import { formatCurrency } from "../lib/stock-format";

const transactionTypes: PortfolioTransactionType[] = [
  "BUY",
  "SELL",
  "UPDATE",
  "DELETE",
];

export function TransactionsPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [tickerFilter, setTickerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingTransaction, setEditingTransaction] =
    useState<PortfolioTransactionDto | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<PortfolioTransactionDto | null>(null);
  const filters = useMemo<TransactionFilters>(
    () => ({
      ...(tickerFilter.trim() ? { ticker: tickerFilter.trim().toUpperCase() } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    }),
    [fromDate, tickerFilter, toDate],
  );
  const hasFilters = Boolean(filters.ticker || filters.fromDate || filters.toDate);
  const transactionsQueryKey = ["transactions", filters] as const;
  const transactionsQuery = useQuery({
    queryKey: transactionsQueryKey,
    queryFn: () => fetchTransactions(accessToken ?? "", filters),
    enabled: Boolean(accessToken),
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePortfolioTransactionRequest;
    }) => updateTransaction(accessToken ?? "", id, input),
    onSuccess: async () => {
      setEditingTransaction(null);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeTransaction(accessToken ?? "", id),
    onSuccess: async () => {
      setDeletingTransaction(null);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const transactions = transactionsQuery.data ?? [];

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
                setTickerFilter("");
                setFromDate("");
                setToDate("");
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
              onChange={(event) => setTickerFilter(event.target.value)}
              placeholder="AAPL"
              value={tickerFilter}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transactions-from-date">{t.fromDate}</Label>
            <Input
              id="transactions-from-date"
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="transactions-to-date">{t.toDate}</Label>
            <Input
              id="transactions-to-date"
              onChange={(event) => setToDate(event.target.value)}
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
          <TransactionsTable
            language={language}
            onDelete={setDeletingTransaction}
            onEdit={setEditingTransaction}
            t={t}
            transactions={transactions}
          />
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
    </main>
  );
}

function TransactionsTable({
  language,
  transactions,
  t,
  onDelete,
  onEdit,
}: {
  language: ProfileLanguage;
  transactions: PortfolioTransactionDto[];
  t: Dictionary;
  onDelete: (transaction: PortfolioTransactionDto) => void;
  onEdit: (transaction: PortfolioTransactionDto) => void;
}) {
  return (
    <div className="portfolio-table-wrap transactions-table-wrap">
      <table className="portfolio-table transactions-table">
        <thead>
          <tr>
            <th>{t.ticker}</th>
            <th>{t.transactionType}</th>
            <th>{t.quantity}</th>
            <th>{t.price}</th>
            <th>{t.currency}</th>
            <th>{t.transactionDate}</th>
            <th>{t.notes}</th>
            <th><span className="visually-hidden">{t.actions}</span></th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <strong>{transaction.ticker}</strong>
                <small>{transaction.companyName}</small>
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
              <td>
                <div className="portfolio-row-actions">
                  <Button variant="outline" onClick={() => onEdit(transaction)}>
                    {t.edit}
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(transaction)}>
                    {t.delete}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  useModalEffects(onClose);

  return (
    <div className="stock-modal-backdrop">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-delete-modal"
        role="dialog"
      >
        <h2 id={headingId}>{t.deleteTransaction}</h2>
        <p>{t.deleteTransactionConfirmation.replace("{ticker}", transaction.ticker)}</p>
        <div className="portfolio-modal-actions">
          <Button disabled={isPending} onClick={onConfirm} variant="danger">
            {isPending ? t.deleting : t.delete}
          </Button>
          <Button disabled={isPending} onClick={onClose} variant="outline">
            {t.cancel}
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
