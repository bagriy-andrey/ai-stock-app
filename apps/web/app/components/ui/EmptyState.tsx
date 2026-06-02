import Link from "next/link";

interface EmptyStateProps {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
}

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  title,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span aria-hidden="true" className="empty-state-mark" />
      <strong>{title}</strong>
      <p>{description}</p>
      {actionHref && actionLabel ? (
        <Link className="empty-state-action" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
