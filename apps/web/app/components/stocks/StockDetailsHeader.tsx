"use client";

import { Heart, List, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Dictionary } from "../../dictionaries";
import { CompanyLogo } from "./CompanyLogo";

interface StockDetailsHeaderProps {
  companyName: string;
  currency?: string;
  exchange?: string;
  headingId: string;
  isWatchlisted: boolean;
  isWatchlistPending: boolean;
  logoUrl?: string;
  onAddPurchase: () => void;
  onClose: () => void;
  onToggleWatchlist: () => void;
  onViewTransactions: () => void;
  t: Dictionary;
  ticker: string;
}

export function StockDetailsHeader({
  companyName,
  currency,
  exchange,
  headingId,
  isWatchlisted,
  isWatchlistPending,
  logoUrl,
  onAddPurchase,
  onClose,
  onToggleWatchlist,
  onViewTransactions,
  t,
  ticker,
}: StockDetailsHeaderProps) {
  const marketMetadata = [exchange, currency].filter(Boolean).join(" / ");

  return (
    <header className="stock-details-header">
      <div className="stock-details-heading">
        <CompanyLogo
          className="stock-details-logo"
          companyName={companyName}
          logoUrl={logoUrl}
          ticker={ticker}
        />
        <div className="stock-details-title-block">
          <p className="stock-modal-ticker">{ticker}</p>
          <h2 id={headingId}>{companyName}</h2>
          <p className="stock-modal-metadata">{marketMetadata || "N/A"}</p>
        </div>
      </div>
      <div className="stock-details-actions" aria-label={t.actions}>
        <IconActionButton
          ariaLabel={isWatchlisted ? t.removeFromWatchlist : t.addToWatchlist}
          disabled={isWatchlistPending}
          isActive={isWatchlisted}
          onClick={onToggleWatchlist}
          tooltip={isWatchlisted ? t.removeFromWatchlist : t.addToWatchlist}
        >
          <Heart aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          ariaLabel={t.addPurchase}
          onClick={onAddPurchase}
          tooltip={t.addPurchase}
        >
          <Plus aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          ariaLabel={t.viewTransactions}
          onClick={onViewTransactions}
          tooltip={t.viewTransactions}
        >
          <List aria-hidden="true" />
        </IconActionButton>
        <IconActionButton
          ariaLabel={t.close}
          className="stock-details-icon-button-danger"
          onClick={onClose}
          tooltip={t.close}
        >
          <X aria-hidden="true" />
        </IconActionButton>
      </div>
    </header>
  );
}

interface IconActionButtonProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  isActive?: boolean;
  onClick: () => void;
  tooltip: string;
}

function IconActionButton({
  ariaLabel,
  children,
  className = "",
  disabled = false,
  isActive = false,
  onClick,
  tooltip,
}: IconActionButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={isActive || undefined}
      className={[
        "stock-details-icon-button",
        isActive ? "stock-details-icon-button-active" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-tooltip={tooltip}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
