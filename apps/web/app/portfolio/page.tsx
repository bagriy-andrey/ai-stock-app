import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { portfolioSortFields } from "../lib/page-sort-fields";
import { parseSortState } from "../lib/table-sorting";
import { PortfolioPage } from "./PortfolioPage";

interface PortfolioRouteProps {
  searchParams?: Promise<{
    order?: string | string[];
    sort?: string | string[];
  }>;
}

export default async function Portfolio({ searchParams }: PortfolioRouteProps) {
  const params = await searchParams;
  const sort = Array.isArray(params?.sort) ? params?.sort[0] : params?.sort;
  const order = Array.isArray(params?.order) ? params?.order[0] : params?.order;
  const initialSortState = parseSortState({
    allowedSorts: portfolioSortFields,
    sort,
    order,
  });

  return (
    <ProtectedRoute>
      <PortfolioPage initialSortState={initialSortState} />
    </ProtectedRoute>
  );
}
