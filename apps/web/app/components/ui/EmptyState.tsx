import Link from "next/link";
import { useId, type ReactNode } from "react";
import { Button } from "./button";

interface EmptyStateProps {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon?: ReactNode;
  onAction?: () => void;
  title: string;
}

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  icon,
  onAction,
  title,
}: EmptyStateProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="empty-state"
    >
      <span
        aria-hidden="true"
        className={icon ? "empty-state-icon" : "empty-state-mark"}
      >
        {icon}
      </span>
      <strong id={titleId}>{title}</strong>
      <p id={descriptionId}>{description}</p>
      {actionHref && actionLabel ? (
        <Link className="empty-state-action empty-state-primary-action ui-button" href={actionHref}>
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <Button
          aria-label={actionLabel}
          className="empty-state-action"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
