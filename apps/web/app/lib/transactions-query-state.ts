import type {
  PortfolioTransactionDto,
  TransactionFilters,
} from "@ai-stock-advisor/shared";

export interface TransactionsQueryState {
  fromDate?: string;
  limit: number;
  page: number;
  ticker?: string;
  toDate?: string;
}

export function buildTransactionsQueryState({
  fromDate,
  limit,
  page,
  ticker,
  toDate,
}: {
  fromDate: string;
  limit: number;
  page: number;
  ticker: string;
  toDate: string;
}): TransactionsQueryState {
  const normalizedTicker = ticker.trim().toUpperCase();

  return {
    page,
    limit,
    ...(normalizedTicker ? { ticker: normalizedTicker } : {}),
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
    ...(state.fromDate ? { fromDate: state.fromDate } : {}),
    ...(state.toDate ? { toDate: state.toDate } : {}),
  };
}

export function hasTransactionFilters(state: TransactionsQueryState): boolean {
  return Boolean(state.ticker || state.fromDate || state.toDate);
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
