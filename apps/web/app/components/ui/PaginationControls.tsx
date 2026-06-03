import { Button } from "./button";

interface PaginationControlsProps {
  currentPage: number;
  nextLabel: string;
  pageLabel: string;
  previousLabel: string;
  totalPages: number;
  ariaLabel?: string;
  isBusy?: boolean;
  onNext: () => void;
  onPrevious: () => void;
}

export function PaginationControls({
  ariaLabel = "Pagination",
  currentPage,
  isBusy = false,
  nextLabel,
  pageLabel,
  previousLabel,
  totalPages,
  onNext,
  onPrevious,
}: PaginationControlsProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const formattedPageLabel = pageLabel
    .replace("{page}", String(currentPage))
    .replace("{totalPages}", String(safeTotalPages));

  return (
    <nav
      aria-busy={isBusy}
      aria-label={ariaLabel}
      className="pagination-controls"
    >
      <Button
        disabled={currentPage <= 1}
        onClick={onPrevious}
        type="button"
        variant="outline"
      >
        {previousLabel}
      </Button>
      <span className="pagination-current-page">{formattedPageLabel}</span>
      <Button
        disabled={currentPage >= safeTotalPages}
        onClick={onNext}
        type="button"
        variant="outline"
      >
        {nextLabel}
      </Button>
    </nav>
  );
}
