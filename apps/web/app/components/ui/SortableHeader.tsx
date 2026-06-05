import type { SortState } from "../../lib/table-sorting";
import { SortIndicator } from "./SortIndicator";

interface SortableHeaderProps<SortKey extends string> {
  label: string;
  onSort: (sort: SortKey) => void;
  sort: SortKey;
  sortState: SortState<SortKey>;
}

export function SortableHeader<SortKey extends string>({
  label,
  onSort,
  sort,
  sortState,
}: SortableHeaderProps<SortKey>) {
  const isActive = sortState.sort === sort;

  return (
    <th aria-sort={getAriaSort(isActive ? sortState.order : undefined)}>
      <button
        className="table-sort-button"
        onClick={() => onSort(sort)}
        type="button"
      >
        <span>{label}</span>
        <span className="table-sort-indicator">
          <SortIndicator order={isActive ? sortState.order : undefined} />
        </span>
      </button>
    </th>
  );
}

function getAriaSort(
  order: SortState<string>["order"] | undefined,
): "ascending" | "descending" | "none" {
  if (order === "asc") {
    return "ascending";
  }

  if (order === "desc") {
    return "descending";
  }

  return "none";
}
