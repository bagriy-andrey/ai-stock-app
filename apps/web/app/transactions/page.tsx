import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { transactionSortFields } from "../lib/page-sort-fields";
import { parseSortState } from "../lib/table-sorting";
import { TransactionsPage } from "./TransactionsPage";

interface TransactionsRouteProps {
  searchParams?: Promise<{
    order?: string | string[];
    sort?: string | string[];
    ticker?: string | string[];
  }>;
}

export default async function Transactions({ searchParams }: TransactionsRouteProps) {
  const params = await searchParams;
  const tickerParam = Array.isArray(params?.ticker)
    ? params?.ticker[0]
    : params?.ticker;
  const sort = Array.isArray(params?.sort) ? params?.sort[0] : params?.sort;
  const order = Array.isArray(params?.order) ? params?.order[0] : params?.order;
  const initialSortState = parseSortState({
    allowedSorts: transactionSortFields,
    sort,
    order,
  });

  return (
    <ProtectedRoute>
      <TransactionsPage
        initialSortState={initialSortState}
        initialTicker={tickerParam ?? ""}
      />
    </ProtectedRoute>
  );
}
