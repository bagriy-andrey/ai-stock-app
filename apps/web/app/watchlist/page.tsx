import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { watchlistSortFields } from "../lib/page-sort-fields";
import { parseSortState } from "../lib/table-sorting";
import { WatchlistPage } from "./WatchlistPage";

interface WatchlistRouteProps {
  searchParams?: Promise<{
    order?: string | string[];
    sort?: string | string[];
  }>;
}

export default async function Watchlist({ searchParams }: WatchlistRouteProps) {
  const params = await searchParams;
  const sort = Array.isArray(params?.sort) ? params?.sort[0] : params?.sort;
  const order = Array.isArray(params?.order) ? params?.order[0] : params?.order;
  const initialSortState = parseSortState({
    allowedSorts: watchlistSortFields,
    sort,
    order,
  });

  return (
    <ProtectedRoute>
      <WatchlistPage initialSortState={initialSortState} />
    </ProtectedRoute>
  );
}
