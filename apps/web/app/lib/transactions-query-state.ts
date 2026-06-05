import type {
  PortfolioTransactionDto,
  PortfolioTransactionType,
  TransactionFilters,
} from "@ai-stock-advisor/shared";

export const transactionTypeFilters = [
  "BUY",
  "SELL",
  "UPDATE",
  "DELETE",
] as const satisfies readonly PortfolioTransactionType[];

export interface TransactionsQueryState {
  fromDate?: string;
  limit: number;
  page: number;
  ticker?: string;
  toDate?: string;
  type?: PortfolioTransactionType;
}

export function buildTransactionsQueryState({
  fromDate,
  limit,
  page,
  ticker,
  toDate,
  type,
}: {
  fromDate: string;
  limit: number;
  page: number;
  ticker: string;
  toDate: string;
  type: PortfolioTransactionType | "";
}): TransactionsQueryState {
  const normalizedTicker = ticker.trim().toUpperCase();

  return {
    page,
    limit,
    ...(normalizedTicker ? { ticker: normalizedTicker } : {}),
    ...(type ? { type } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
  };
}

export function buildTransactionsQueryKey(state: TransactionsQueryState) {
  return [
    "transactions",
    {
      page: state.page,
      limit: state.limit,
      ticker: state.ticker ?? "",
      type: state.type ?? "",
      fromDate: state.fromDate ?? "",
      toDate: state.toDate ?? "",
    },
  ] as const;
}

export function buildTransactionsListQueryKey(state: TransactionsQueryState) {
  return [
    "transactions",
    {
      ticker: state.ticker ?? "",
      type: state.type ?? "",
      fromDate: state.fromDate ?? "",
      toDate: state.toDate ?? "",
    },
  ] as const;
}

export function toTransactionFilters(
  state: TransactionsQueryState,
): TransactionFilters {
  return {
    page: state.page,
    limit: state.limit,
    ...(state.ticker ? { ticker: state.ticker } : {}),
    ...(state.type ? { type: state.type } : {}),
    ...(state.fromDate ? { fromDate: state.fromDate } : {}),
    ...(state.toDate ? { toDate: state.toDate } : {}),
  };
}

export function hasTransactionFilters(state: TransactionsQueryState): boolean {
  return Boolean(state.ticker || state.type || state.fromDate || state.toDate);
}

export function getPageAfterTransactionsFilterChange(): number {
  return 1;
}

export function transactionMatchesFilters(
  transaction: PortfolioTransactionDto,
  state: TransactionsQueryState,
): boolean {
  if (state.ticker && transaction.ticker !== state.ticker) {
    return false;
  }

  if (state.type && transaction.type !== state.type) {
    return false;
  }

  const transactionTime = new Date(transaction.transactionDate).getTime();

  if (state.fromDate && transactionTime < new Date(state.fromDate).getTime()) {
    return false;
  }

  if (state.toDate) {
    const toDate = new Date(state.toDate);

    if (/^\d{4}-\d{2}-\d{2}$/.test(state.toDate)) {
      toDate.setUTCHours(23, 59, 59, 999);
    }

    if (transactionTime > toDate.getTime()) {
      return false;
    }
  }

  return true;
}

export function parseTransactionTypeFilter(
  value: string | null | undefined,
): PortfolioTransactionType | undefined {
  const normalizedValue = value?.trim().toUpperCase();

  return transactionTypeFilters.find((type) => type === normalizedValue);
}
