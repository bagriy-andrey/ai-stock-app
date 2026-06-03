"use client";

import type {
  CreatePortfolioPositionRequest,
  PortfolioDto,
  PortfolioPositionDto,
  ProfileLanguage,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import type { Dictionary } from "../dictionaries";
import { fetchMarketQuote, searchMarketSymbols } from "../lib/market-data-api";
import {
  createPortfolioPosition,
  fetchPortfolio,
} from "../lib/portfolio-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../lib/stock-format";

const portfolioQueryKey = ["portfolio"] as const;

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const portfolioQuery = useQuery({
    queryKey: portfolioQueryKey,
    queryFn: () => fetchPortfolio(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: 2 * 60 * 1_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePortfolioPositionRequest) =>
      createPortfolioPosition(accessToken ?? "", input),
    onSuccess: async () => {
      setIsAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
    },
  });

  const portfolio = portfolioQuery.data;
  const positions = portfolio?.positions ?? [];
  const summaryCurrency = positions[0]?.currency ?? "USD";

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">{t.portfolio}</p>
        <h1>{t.portfolioPositions}</h1>
        <p className="subtitle">{t.portfolioSubtitle}</p>
      </header>

      <section aria-labelledby="portfolio-summary-heading" className="page-section">
        <div className="section-heading portfolio-heading">
          <h2 id="portfolio-summary-heading">{t.portfolioSummary}</h2>
          <Button onClick={() => setIsAddOpen(true)}>{t.addPosition}</Button>
        </div>
        {portfolioQuery.isLoading ? (
          <p role="status">{t.loadingPortfolio}</p>
        ) : portfolioQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.portfolioLoadError}</p>
        ) : portfolio ? (
          <PortfolioSummary
            currency={summaryCurrency}
            language={language}
            portfolio={portfolio}
            t={t}
          />
        ) : null}
      </section>

      <section aria-labelledby="portfolio-positions-heading" className="page-section">
        <h2 id="portfolio-positions-heading">{t.yourPositions}</h2>
        {portfolioQuery.isLoading ? (
          <p role="status">{t.loadingPositions}</p>
        ) : portfolioQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.positionsLoadError}</p>
        ) : positions.length === 0 ? (
          <EmptyState
            description={t.portfolioEmpty}
            title={t.noPortfolioPositionsYet}
          />
        ) : (
          <PositionsTable
            language={language}
            positions={positions}
            t={t}
          />
        )}
      </section>

      {isAddOpen ? (
        <PortfolioPositionModal
          accessToken={accessToken ?? ""}
          error={createMutation.error}
          isPending={createMutation.isPending}
          onClose={() => setIsAddOpen(false)}
          onSubmit={(input) => createMutation.mutate(input)}
          t={t}
        />
      ) : null}
    </main>
  );
}

interface PortfolioSummaryProps {
  currency: string;
  language: ProfileLanguage;
  portfolio: PortfolioDto;
  t: Dictionary;
}

function PortfolioSummary({
  currency,
  language,
  portfolio,
  t,
}: PortfolioSummaryProps) {
  const { summary } = portfolio;

  return (
    <div className="portfolio-summary-grid">
      <SummaryCard
        label={t.totalValue}
        value={formatCurrency(summary.totalCurrentValue, currency, language)}
      />
      <SummaryCard
        label={t.totalCost}
        value={formatCurrency(summary.totalCostBasis, currency, language)}
      />
      <SummaryCard
        label={t.totalProfitLoss}
        value={formatCurrency(summary.totalProfitLoss, currency, language, true)}
        variant={getChangeVariant(summary.totalProfitLoss)}
      />
      <SummaryCard
        label={t.numberOfPositions}
        value={String(summary.positionsCount)}
      />
      <SummaryCard
        label={t.totalStocks}
        value={formatNumber(summary.totalStocksCount, language)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "positive" | "negative" | "neutral";
}) {
  return (
    <Card className="portfolio-summary-card">
      <span>{label}</span>
      <strong className={variant}>{value}</strong>
    </Card>
  );
}

interface PositionsTableProps {
  language: ProfileLanguage;
  positions: PortfolioPositionDto[];
  t: Dictionary;
}

function PositionsTable({
  language,
  positions,
  t,
}: PositionsTableProps) {
  return (
    <div className="portfolio-table-wrap">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>{t.name}</th>
            <th>{t.quantity}</th>
            <th>{t.currentStockPrice}</th>
            <th>{t.currentValue}</th>
            <th>{t.profitLossUsd}</th>
            <th>{t.profitLossPercent}</th>
            <th><span className="visually-hidden">{t.actions}</span></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => {
            const variant = getChangeVariant(position.profitLoss);

            return (
              <tr key={position.ticker}>
                <td>
                  <strong>{position.ticker}</strong>
                  <small>{position.companyName}</small>
                </td>
                <td>{formatNumber(position.quantity, language)}</td>
                <td>
                  {formatCurrency(
                    position.currentPrice,
                    position.currency,
                    language,
                  )}
                </td>
                <td>
                  {formatCurrency(
                    position.currentValue,
                    position.currency,
                    language,
                  )}
                </td>
                <td className={variant}>
                  {formatCurrency(
                    position.profitLoss,
                    position.currency,
                    language,
                    true,
                  )}
                </td>
                <td className={variant}>
                  {formatPercent(position.profitLossPercent, language)}
                </td>
                <td>
                  <div className="portfolio-row-actions">
                    <Link
                      className="ui-button ui-button-outline"
                      href="/transactions"
                    >
                      {t.viewTransactions}
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface PortfolioPositionModalProps {
  accessToken: string;
  error: Error | null;
  isPending: boolean;
  position?: PortfolioPositionDto;
  t: Dictionary;
  onClose: () => void;
  onSubmit: (input: CreatePortfolioPositionRequest) => void;
}

function PortfolioPositionModal({
  accessToken,
  error,
  isPending,
  position,
  t,
  onClose,
  onSubmit,
}: PortfolioPositionModalProps) {
  const headingId = useId();
  const [searchInput, setSearchInput] = useState(position?.ticker ?? "");
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    position
      ? {
          ticker: position.ticker,
          name: position.companyName,
          currency: position.currency,
          exchange: "",
          type: "",
        }
      : null,
  );
  const [quantity, setQuantity] = useState(String(position?.quantity ?? ""));
  const [averagePurchasePrice, setAveragePurchasePrice] = useState(
    String(position?.averagePurchasePrice ?? ""),
  );
  const [currency, setCurrency] = useState(position?.currency ?? "USD");
  const [purchaseDate, setPurchaseDate] = useState(getCurrentLocalDateTime());
  const [formError, setFormError] = useState<string | null>(null);
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), 350);
  const searchQuery = useQuery({
    queryKey: ["market-data", "search", debouncedSearchInput],
    queryFn: () => searchMarketSymbols(accessToken, debouncedSearchInput),
    enabled:
      !position && !selectedStock && debouncedSearchInput.length >= 2,
    retry: false,
  });
  const quoteMutation = useMutation({
    mutationFn: (ticker: string) => fetchMarketQuote(accessToken, ticker),
    onSuccess: (quote) => setAveragePurchasePrice(String(quote.currentPrice)),
  });
  const latestPurchaseDate = getCurrentLocalDateTime();

  useModalEffects(onClose);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStock) {
      setFormError(t.chooseStockError);
      return;
    }

    const parsedPurchaseDate = new Date(purchaseDate);

    if (
      Number.isNaN(parsedPurchaseDate.getTime()) ||
      parsedPurchaseDate.getTime() > Date.now()
    ) {
      setFormError(t.futurePurchaseDateError);
      return;
    }

    onSubmit({
      ticker: selectedStock.ticker,
      companyName: selectedStock.name,
      quantity: Number(quantity),
      averagePurchasePrice: Number(averagePurchasePrice),
      currency,
      purchaseDate: parsedPurchaseDate.toISOString(),
    });
  };

  return (
    <div className="stock-modal-backdrop">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal"
        role="dialog"
      >
        <h2 id={headingId}>{position ? t.editPosition : t.addPosition}</h2>
        <form className="portfolio-form" onSubmit={handleSubmit}>
          <div className="profile-field profile-field-full stock-search">
            <Label htmlFor="portfolio-ticker">{t.ticker}</Label>
            <Input
              autoComplete="off"
              disabled={Boolean(position) || isPending}
              id="portfolio-ticker"
              onChange={(event) => {
                setSearchInput(event.target.value);
                setSelectedStock(null);
                setFormError(null);
              }}
              placeholder={t.stockSearchPlaceholder}
              required
              value={searchInput}
            />
            {!position && !selectedStock && debouncedSearchInput.length >= 2 ? (
              <PositionSearchResults
                error={searchQuery.error}
                isLoading={searchQuery.isLoading}
                onSelect={(stock) => {
                  setSelectedStock(stock);
                  setSearchInput(stock.ticker);
                  setCurrency(stock.currency || "USD");
                  setAveragePurchasePrice("");
                  setFormError(null);
                  quoteMutation.mutate(stock.ticker);
                }}
                results={searchQuery.data ?? []}
                t={t}
              />
            ) : null}
          </div>
          <div className="profile-field">
            <Label htmlFor="portfolio-quantity">{t.quantity}</Label>
            <Input
              id="portfolio-quantity"
              min="0.00000001"
              onChange={(event) => setQuantity(event.target.value)}
              required
              step="any"
              type="number"
              value={quantity}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="portfolio-average-price">{t.averagePurchasePrice}</Label>
            <Input
              id="portfolio-average-price"
              min="0.00000001"
              onChange={(event) => setAveragePurchasePrice(event.target.value)}
              required
              step="any"
              type="number"
              value={averagePurchasePrice}
            />
            {quoteMutation.isPending ? (
              <small className="portfolio-field-status">{t.loadingCurrentPrice}</small>
            ) : quoteMutation.error instanceof Error ? (
              <small className="portfolio-field-status error-text">
                {t.currentPricePresetError}
              </small>
            ) : null}
          </div>
          <div className="profile-field">
            <Label htmlFor="portfolio-currency">{t.currency}</Label>
            <Input
              id="portfolio-currency"
              maxLength={3}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              value={currency}
            />
          </div>
          <div className="profile-field">
            <Label htmlFor="portfolio-purchase-date">{t.purchaseDate}</Label>
            <Input
              id="portfolio-purchase-date"
              max={latestPurchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              required
              step="60"
              type="datetime-local"
              value={purchaseDate}
            />
          </div>
          <div className="portfolio-modal-actions profile-field-full">
            <Button disabled={isPending} type="submit">
              {isPending ? t.saving : t.savePosition}
            </Button>
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              {t.cancel}
            </Button>
          </div>
        </form>
        {formError ? <p className="error-text" role="alert">{formError}</p> : null}
        {error instanceof Error ? (
          <p className="error-text" role="alert">{t.positionSaveError}</p>
        ) : null}
      </section>
    </div>
  );
}

function PositionSearchResults({
  error,
  isLoading,
  results,
  t,
  onSelect,
}: {
  error: Error | null;
  isLoading: boolean;
  results: StockSearchResult[];
  t: Dictionary;
  onSelect: (stock: StockSearchResult) => void;
}) {
  if (isLoading) {
    return <p className="search-status" role="status">{t.searching}</p>;
  }

  if (error) {
    return <p className="search-status error-text" role="alert">{t.stockSearchUnavailable}</p>;
  }

  if (results.length === 0) {
    return <p className="search-status">{t.noMatchingStocks}</p>;
  }

  return (
    <ul className="search-results" aria-label={t.stockSearchResults}>
      {results.map((stock) => (
        <li key={`${stock.ticker}-${stock.exchange}`}>
          <button type="button" onClick={() => onSelect(stock)}>
            <strong>{stock.ticker}</strong>
            <span>{stock.name}</span>
            <small>{stock.exchange || t.exchangeUnavailable}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

function useDebouncedValue(value: string, delayMilliseconds: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedValue(value),
      delayMilliseconds,
    );

    return () => window.clearTimeout(timeout);
  }, [delayMilliseconds, value]);

  return debouncedValue;
}

function useModalEffects(onClose: () => void): void {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
}

function formatNumber(value: number, language: ProfileLanguage): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 6,
  }).format(value);
}

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
