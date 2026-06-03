import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { TransactionsPage } from "./TransactionsPage";

interface TransactionsRouteProps {
  searchParams?: Promise<{
    ticker?: string | string[];
  }>;
}

export default async function Transactions({ searchParams }: TransactionsRouteProps) {
  const params = await searchParams;
  const tickerParam = Array.isArray(params?.ticker)
    ? params?.ticker[0]
    : params?.ticker;

  return (
    <ProtectedRoute>
      <TransactionsPage initialTicker={tickerParam ?? ""} />
    </ProtectedRoute>
  );
}
