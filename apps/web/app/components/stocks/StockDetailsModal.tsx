"use client";

import type {
  CreatePortfolioPositionRequest,
  MarketMoversResponse,
  PortfolioDto,
  ProfileLanguage,
  StockCandleRange,
  StockDetails,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  AddPurchaseModal,
  type AddPurchasePrefill,
} from "../portfolio/AddPurchaseModal";
import { Button } from "../ui/button";
import { useI18n } from "../i18n/I18nProvider";
import type { Dictionary } from "../../dictionaries";
import {
  fetchStockCandles,
  fetchStockDetails,
  type StockChartCandle,
} from "../../lib/market-data-api";
import { createPortfolioPosition } from "../../lib/portfolio-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../../lib/stock-format";
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from "../../lib/watchlist-api";
import { CompanyLogo } from "./CompanyLogo";

const candleRanges: StockCandleRange[] = ["1d", "1w", "1m", "1y"];

interface StockDetailsModalProps {
  ticker: string;
  open: boolean;
  onClose: () => void;
}

export function StockDetailsModal({
  ticker,
  open,
  onClose,
}: StockDetailsModalProps) {
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const headingId = useId();
  const chartHeadingId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const [range, setRange] = useState<StockCandleRange>("1d");
  const [purchasePrefill, setPurchasePrefill] =
    useState<AddPurchasePrefill | null>(null);
  const normalizedTicker = ticker.trim().toUpperCase();
  const watchlistQueryKey = ["watchlist"] as const;
  const portfolioQueryKey = ["portfolio"] as const;
  const transactionsQueryKey = ["transactions"] as const;
  const detailsQuery = useQuery({
    queryKey: ["market", "stocks", normalizedTicker, "details"],
    queryFn: () => fetchStockDetails(accessToken ?? "", normalizedTicker),
    enabled: open && Boolean(accessToken) && normalizedTicker.length > 0,
    retry: false,
  });
  const candlesQuery = useQuery({
    queryKey: ["market", "stocks", normalizedTicker, "candles", range],
    queryFn: () => fetchStockCandles(accessToken ?? "", normalizedTicker, range),
    enabled: open && Boolean(accessToken) && normalizedTicker.length > 0,
    retry: false,
  });
  const watchlistQuery = useQuery({
    queryKey: watchlistQueryKey,
    queryFn: () => fetchWatchlist(accessToken ?? ""),
    enabled: open && Boolean(accessToken),
  });
  const watchlistItem = watchlistQuery.data?.find(
    (item) => item.ticker.toUpperCase() === normalizedTicker,
  );
  const addWatchlistMutation = useMutation({
    mutationFn: () =>
      addWatchlistItem(accessToken ?? "", {
        ticker: normalizedTicker,
        companyName: getActionCompanyName(companyName, t),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });
  const removeWatchlistMutation = useMutation({
    mutationFn: (id: string) => removeWatchlistItem(accessToken ?? "", id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });
  const createPurchaseMutation = useMutation({
    mutationFn: (input: CreatePortfolioPositionRequest) =>
      createPortfolioPosition(accessToken ?? "", input),
    onSuccess: async () => {
      setPurchasePrefill(null);
      await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
    },
  });
  const details = detailsQuery.data;
  const candles = candlesQuery.data ?? [];
  const companyName =
    details?.name ??
    getCachedCompanyName(queryClient, normalizedTicker) ??
    t.companyNameNotSet;
  const isWatchlistMutationPending =
    addWatchlistMutation.isPending || removeWatchlistMutation.isPending;
  const watchlistActionError =
    addWatchlistMutation.error instanceof Error
      ? t.addStockError
      : removeWatchlistMutation.error instanceof Error
        ? t.removeStockError
        : null;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setRange("1d");
    }
  }, [open, normalizedTicker]);

  useEffect(() => {
    if (!open || normalizedTicker.length === 0) {
      return;
    }

    const dialog = dialogRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusableElements = getFocusableElements(dialog);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    if (dialog) {
      (getFocusableElements(dialog)[0] ?? dialog).focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [open, normalizedTicker]);

  if (!open || normalizedTicker.length === 0) {
    return null;
  }

  return (
    <div
      className="stock-modal-backdrop"
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={t.close}
          className="stock-modal-close"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
        <div className="stock-modal-header">
          <CompanyLogo
            companyName={companyName}
            logoUrl={details?.logoUrl}
            ticker={normalizedTicker}
          />
          <div>
            <p className="stock-modal-ticker">
              {t.stockDetails} / {normalizedTicker}
            </p>
            <h2 id={headingId}>{companyName}</h2>
            <p className="stock-modal-metadata">
              {[details?.exchange, details?.currency].filter(Boolean).join(" / ")}
            </p>
          </div>
        </div>
        {detailsQuery.isLoading ? (
          <p role="status">{t.loadingStockDetails}</p>
        ) : detailsQuery.error instanceof Error ? (
          <p className="error-text" role="alert">{t.stockDetailsUnavailable}</p>
        ) : details ? (
          <StockSummary details={details} language={language} t={t} />
        ) : null}
        <div className="stock-modal-actions" aria-label={t.actions}>
          <Button
            disabled={isWatchlistMutationPending || watchlistQuery.isLoading}
            onClick={() => {
              if (watchlistItem) {
                removeWatchlistMutation.mutate(watchlistItem.id);
                return;
              }

              addWatchlistMutation.mutate();
            }}
            type="button"
            variant={watchlistItem ? "danger" : "default"}
          >
            {isWatchlistMutationPending
              ? watchlistItem
                ? t.removing
                : t.adding
              : watchlistItem
                ? t.removeFromWatchlist
                : t.addToWatchlist}
          </Button>
          <Button
            onClick={() =>
              setPurchasePrefill({
                ticker: normalizedTicker,
                companyName: getActionCompanyName(companyName, t),
                currency: details?.currency,
              })
            }
            type="button"
            variant="outline"
          >
            {t.addPurchase}
          </Button>
          <Button
            onClick={() => {
              const target = `/transactions?ticker=${encodeURIComponent(
                normalizedTicker,
              )}`;

              if (pathname === "/transactions") {
                router.replace(target);
              } else {
                router.push(target);
              }
            }}
            type="button"
            variant="outline"
          >
            {t.viewTransactions}
          </Button>
        </div>
        {watchlistActionError ? (
          <p className="error-text" role="alert">{watchlistActionError}</p>
        ) : null}
        <section
          aria-labelledby={chartHeadingId}
          className="stock-chart-section"
        >
          <div className="stock-chart-header">
            <h3 id={chartHeadingId}>{t.priceHistory}</h3>
            <div
              aria-label={t.chartRange}
              className="stock-chart-ranges"
              role="group"
            >
              {candleRanges.map((option) => (
                <button
                  aria-pressed={range === option}
                  key={option}
                  onClick={() => setRange(option)}
                  type="button"
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {candlesQuery.isLoading ? (
            <p className="stock-chart-status" role="status">{t.loadingChart}</p>
          ) : candlesQuery.error instanceof Error ? (
            <p className="stock-chart-status error-text" role="alert">{t.chartUnavailable}</p>
          ) : candles.length === 0 ? (
            <p className="stock-chart-status">{t.noChartData}</p>
          ) : (
            <StockHistoryChart
              candles={candles}
              currency={details?.currency}
              language={language}
              range={range}
              title={t.priceHistory}
            />
          )}
        </section>
        {purchasePrefill ? (
          <AddPurchaseModal
            accessToken={accessToken ?? ""}
            error={createPurchaseMutation.error}
            initialStock={purchasePrefill}
            isPending={createPurchaseMutation.isPending}
            onClose={() => setPurchasePrefill(null)}
            onSubmit={(input) => createPurchaseMutation.mutate(input)}
            t={t}
          />
        ) : null}
      </section>
    </div>
  );
}

function getActionCompanyName(
  companyName: string,
  t: Dictionary,
): string | undefined {
  return companyName === t.companyNameNotSet ? undefined : companyName;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function getCachedCompanyName(
  queryClient: QueryClient,
  ticker: string,
): string | undefined {
  const watchlistItem = queryClient
    .getQueryData<WatchlistItemDto[]>(["watchlist"])
    ?.find((item) => item.ticker.toUpperCase() === ticker);

  if (watchlistItem?.companyName) {
    return watchlistItem.companyName;
  }

  const marketMovers = queryClient.getQueryData<MarketMoversResponse>([
    "market",
    "movers",
  ]);
  const marketMover = [
    ...(marketMovers?.gainers ?? []),
    ...(marketMovers?.losers ?? []),
  ].find((mover) => mover.symbol.toUpperCase() === ticker);

  if (marketMover?.name) {
    return marketMover.name;
  }

  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: ["portfolio"] })) {
    const portfolio = query.state.data as PortfolioDto | undefined;
    const position = portfolio?.items.find(
      (item) => item.ticker.toUpperCase() === ticker,
    );

    if (position?.companyName) {
      return position.companyName;
    }
  }

  return undefined;
}

interface StockSummaryProps {
  details: StockDetails;
  language: ProfileLanguage;
  t: Dictionary;
}

function StockSummary({ details, language, t }: StockSummaryProps) {
  return (
    <>
      <div className="stock-modal-price">
        <span>{t.currentPrice}</span>
        <strong>
          {formatPrice(details.currentPrice, details.currency, language)}
        </strong>
        <ChangeValue details={details} language={language} />
      </div>
      <dl className="stock-detail-grid">
        <StockDetail
          label={t.previousClose}
          value={formatPrice(details.previousClose, details.currency, language)}
        />
        <StockDetail
          label={t.openPrice}
          value={formatPrice(details.open, details.currency, language)}
        />
        <StockDetail
          label={t.dayHigh}
          value={formatPrice(details.high, details.currency, language)}
        />
        <StockDetail
          label={t.dayLow}
          value={formatPrice(details.low, details.currency, language)}
        />
      </dl>
      <StockFundamentalsSection
        details={details}
        language={language}
        t={t}
      />
    </>
  );
}

interface StockFundamentalsSectionProps {
  details: StockDetails;
  language: ProfileLanguage;
  t: Dictionary;
}

function StockFundamentalsSection({
  details,
  language,
  t,
}: StockFundamentalsSectionProps) {
  const fundamentals = details.fundamentals ?? {};

  return (
    <section className="stock-fundamentals-section">
      <h3>{t.fundamentals}</h3>
      <dl className="stock-detail-grid stock-fundamentals-grid">
        <StockDetail
          label={t.marketCap}
          value={formatMarketCap(
            fundamentals.marketCap,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockDetail
          label={t.peRatio}
          value={formatOptionalNumber(fundamentals.peRatio, language)}
        />
        <StockDetail
          label={t.eps}
          value={formatOptionalPrice(
            fundamentals.eps,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockDetail
          label={t.fiftyTwoWeekHigh}
          value={formatOptionalPrice(
            fundamentals.fiftyTwoWeekHigh,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockDetail
          label={t.fiftyTwoWeekLow}
          value={formatOptionalPrice(
            fundamentals.fiftyTwoWeekLow,
            fundamentals.currency ?? details.currency,
            language,
          )}
        />
        <StockDetail label={t.sector} value={formatOptionalText(fundamentals.sector)} />
        <StockDetail
          label={t.industry}
          value={formatOptionalText(fundamentals.industry)}
        />
        <StockDetail
          label={t.exchange}
          value={formatOptionalText(fundamentals.exchange)}
        />
        <StockDetail
          label={t.currency}
          value={formatOptionalText(fundamentals.currency)}
        />
      </dl>
    </section>
  );
}

interface ChangeValueProps {
  details: StockDetails;
  language: ProfileLanguage;
}

function ChangeValue({ details, language }: ChangeValueProps) {
  const variant = getChangeVariant(details.change);

  return (
    <span className={`stock-change stock-change-${variant}`}>
      {formatPrice(details.change, details.currency, language, true)}
      <small>{formatPercent(details.percentChange, language)}</small>
    </span>
  );
}

interface StockHistoryChartProps {
  candles: StockChartCandle[];
  currency?: string;
  language: ProfileLanguage;
  range: StockCandleRange;
  title: string;
}

function StockHistoryChart({
  candles,
  currency,
  language,
  range,
  title,
}: StockHistoryChartProps) {
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const closes = candles.map((candle) => candle.close);
  const minimum = Math.min(...closes);
  const maximum = Math.max(...closes);
  const spread = maximum - minimum;
  const width = 640;
  const height = 240;
  const padding = 10;
  const points = candles
    .map((candle, index) => {
      const x =
        candles.length === 1
          ? width / 2
          : padding + (index / (candles.length - 1)) * (width - 2 * padding);
      const y =
        spread === 0
          ? height / 2
          : padding +
            ((maximum - candle.close) / spread) * (height - 2 * padding);

      return `${x},${y}`;
    })
    .join(" ");
  const variant = getChangeVariant(lastCandle.close - firstCandle.close);

  return (
    <div className="stock-chart">
      <div className="stock-chart-prices">
        <strong>{formatPrice(firstCandle.close, currency, language)}</strong>
        <strong className={`stock-chart-value-${variant}`}>
          {formatPrice(lastCandle.close, currency, language)}
        </strong>
      </div>
      <svg aria-label={title} role="img" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          className={`stock-chart-line-${variant}`}
          fill="none"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="stock-chart-dates">
        <span>{formatCandleDate(firstCandle.timestamp, language, range)}</span>
        <span>{formatCandleDate(lastCandle.timestamp, language, range)}</span>
      </div>
    </div>
  );
}

function formatPrice(
  price: number,
  currency: string | undefined,
  language: ProfileLanguage,
  withSign = false,
): string {
  return currency
    ? formatCurrency(price, currency, language, withSign)
    : new Intl.NumberFormat(language, {
        maximumFractionDigits: 2,
        signDisplay: withSign ? "always" : "auto",
      }).format(price);
}

function formatMarketCap(
  value: number | undefined,
  currency: string | undefined,
  language: ProfileLanguage,
): string {
  if (!isFiniteNumber(value)) {
    return "N/A";
  }

  try {
    return new Intl.NumberFormat(language, {
      style: currency ? "currency" : "decimal",
      currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(language, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
}

function formatOptionalPrice(
  value: number | undefined,
  currency: string | undefined,
  language: ProfileLanguage,
): string {
  return isFiniteNumber(value) ? formatPrice(value, currency, language) : "N/A";
}

function formatOptionalNumber(
  value: number | undefined,
  language: ProfileLanguage,
): string {
  return isFiniteNumber(value)
    ? new Intl.NumberFormat(language, {
        maximumFractionDigits: 2,
      }).format(value)
    : "N/A";
}

function formatOptionalText(value: string | undefined): string {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : "N/A";
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatCandleDate(
  timestamp: string,
  language: ProfileLanguage,
  range: StockCandleRange,
): string {
  return new Intl.DateTimeFormat(
    language,
    range === "1d"
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: range === "1y" ? "numeric" : undefined },
  ).format(new Date(timestamp));
}

interface StockDetailProps {
  label: string;
  value: string;
}

function StockDetail({ label, value }: StockDetailProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
