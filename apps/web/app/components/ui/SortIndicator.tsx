import type { SortOrder } from "../../lib/table-sorting";

interface SortIndicatorProps {
  order?: SortOrder;
}

export function SortIndicator({ order }: SortIndicatorProps) {
  if (order === "asc") {
    return (
      <svg
        aria-hidden="true"
        className="sort-indicator-icon sort-indicator-icon-active"
        viewBox="0 0 16 16"
      >
        <path d="M8 3l4 4H9v6H7V7H4l4-4z" />
      </svg>
    );
  }

  if (order === "desc") {
    return (
      <svg
        aria-hidden="true"
        className="sort-indicator-icon sort-indicator-icon-active"
        viewBox="0 0 16 16"
      >
        <path d="M8 13l-4-4h3V3h2v6h3l-4 4z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="sort-indicator-icon"
      viewBox="0 0 16 16"
    >
      <path d="M8 3l3 3H5l3-3z" />
      <path d="M8 13l-3-3h6l-3 3z" />
    </svg>
  );
}
