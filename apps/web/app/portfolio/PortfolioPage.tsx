"use client";

import type {
  CreatePortfolioPositionRequest,
  CreatePortfolioTransactionRequest,
  PortfolioDto,
  PortfolioPositionDto,
  PortfolioTransactionDto,
  UpdatePortfolioTransactionRequest,
  ProfileLanguage,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import type { Dictionary } from "../dictionaries";
import { fetchMarketQuote, searchMarketSymbols } from "../lib/market-data-api";
import {
  createPortfolioPosition,
  fetchPortfolio,
} from "../lib/portfolio-api";
import {
  createTransaction,
  fetchTransactions,
  updateTransaction,
} from "../lib/transactions-api";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../lib/stock-format";

const portfolioQueryKey = ["portfolio"] as const;
const transactionsQueryKey = ["transactions"] as const;

type PortfolioAction = "add" | "edit" | "sell" | "delete";
type DeletePositionMode = "partial" | "close";

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [actionPosition, setActionPosition] =
    useState<PortfolioPositionDto | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      setStatusMessage(t.portfolioActionSuccess);
      await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
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
          <PortfolioOverviewState
            message={t.loadingPortfolio}
            role="status"
            title={t.portfolioAllocation}
          />
        ) : portfolioQuery.error instanceof Error ? (
          <PortfolioOverviewState
            message={t.portfolioLoadError}
            role="alert"
            title={t.portfolioAllocation}
            variant="error"
          />
        ) : portfolio ? (
          <PortfolioOverview
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
            onEdit={(position) => {
              setStatusMessage(null);
              setActionPosition(position);
            }}
            positions={positions}
            t={t}
          />
        )}
        {statusMessage ? (
          <p className="portfolio-action-status" role="status">
            {statusMessage}
          </p>
        ) : null}
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
      {actionPosition ? (
        <PortfolioActionModal
          accessToken={accessToken ?? ""}
          language={language}
          onClose={() => setActionPosition(null)}
          onSuccess={() => {
            setActionPosition(null);
            setStatusMessage(t.portfolioActionSuccess);
          }}
          position={actionPosition}
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

function PortfolioOverview({
  currency,
  language,
  portfolio,
  t,
}: PortfolioSummaryProps) {
  return (
    <div className="portfolio-overview-grid">
      <PortfolioSummary
        currency={currency}
        language={language}
        portfolio={portfolio}
        t={t}
      />
      <PortfolioAllocationChart
        currency={currency}
        language={language}
        positions={portfolio.positions}
        totalCurrentValue={portfolio.summary.totalCurrentValue}
        t={t}
      />
    </div>
  );
}

function PortfolioOverviewState({
  message,
  role,
  title,
  variant,
}: {
  message: string;
  role: "alert" | "status";
  title: string;
  variant?: "error";
}) {
  return (
    <div className="portfolio-overview-grid">
      <div>
        <p className={variant === "error" ? "error-text" : undefined} role={role}>
          {message}
        </p>
      </div>
      <Card className="portfolio-allocation-card">
        <h3>{title}</h3>
        <p
          className={`portfolio-allocation-status${
            variant === "error" ? " error-text" : ""
          }`}
          role={role}
        >
          {message}
        </p>
      </Card>
    </div>
  );
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

interface PortfolioAllocationChartProps {
  currency: string;
  language: ProfileLanguage;
  positions: PortfolioPositionDto[];
  totalCurrentValue: number;
  t: Dictionary;
}

interface AllocationSegment {
  color: string;
  companyName: string;
  currentValue: number;
  endPercent: number;
  percent: number;
  startPercent: number;
  ticker: string;
}

interface AllocationTooltip {
  segment: AllocationSegment;
  x: number;
  y: number;
}

const allocationColors = [
  "#38bdf8",
  "#86efac",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#c084fc",
];

function PortfolioAllocationChart({
  currency,
  language,
  positions,
  totalCurrentValue,
  t,
}: PortfolioAllocationChartProps) {
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const tooltipId = useId();
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<AllocationTooltip | null>(null);
  const segments = buildAllocationSegments(positions, totalCurrentValue);

  const showTooltipAtPointer = (
    segment: AllocationSegment,
    event: ReactMouseEvent<SVGPathElement>,
  ) => {
    const bounds = chartWrapRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    setTooltip({
      segment,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const showTooltipAtSegment = (segment: AllocationSegment) => {
    const bounds = chartWrapRef.current?.getBoundingClientRect();
    const position = getSegmentTooltipPosition(segment);

    setTooltip({
      segment,
      x: ((bounds?.width ?? 220) * position.x) / 100,
      y: ((bounds?.height ?? 220) * position.y) / 100,
    });
  };

  return (
    <Card className="portfolio-allocation-card">
      <div className="portfolio-allocation-header">
        <div>
          <h3 id={chartTitleId}>{t.portfolioAllocation}</h3>
          <p id={chartDescriptionId}>{t.allocationByCurrentValue}</p>
        </div>
      </div>
      {segments.length === 0 ? (
        <EmptyState
          description={t.portfolioEmpty}
          title={t.noAllocationData}
        />
      ) : (
        <div className="portfolio-allocation-content">
          <div className="portfolio-allocation-chart-wrap" ref={chartWrapRef}>
            <svg
              aria-describedby={chartDescriptionId}
              aria-labelledby={chartTitleId}
              className="portfolio-allocation-chart"
              role="img"
              viewBox="0 0 220 220"
            >
              <circle
                className="portfolio-allocation-ring"
                cx="110"
                cy="110"
                r="74"
              />
              {segments.map((segment) => (
                <path
                  aria-describedby={
                    tooltip?.segment.ticker === segment.ticker
                      ? tooltipId
                      : undefined
                  }
                  aria-label={formatAllocationLabel(
                    segment,
                    currency,
                    language,
                  )}
                  className="portfolio-allocation-segment"
                  d={describePieSegment(
                    segment.startPercent,
                    segment.endPercent,
                  )}
                  fill={segment.color}
                  key={segment.ticker}
                  onBlur={() => setTooltip(null)}
                  onFocus={() => showTooltipAtSegment(segment)}
                  onMouseEnter={(event) => showTooltipAtPointer(segment, event)}
                  onMouseLeave={() => setTooltip(null)}
                  onMouseMove={(event) => showTooltipAtPointer(segment, event)}
                  tabIndex={0}
                />
              ))}
            </svg>
            {tooltip ? (
              <div
                className="portfolio-allocation-tooltip"
                id={tooltipId}
                role="tooltip"
                style={
                  {
                    "--tooltip-x": `${tooltip.x}px`,
                    "--tooltip-y": `${tooltip.y}px`,
                  } as CSSProperties
                }
              >
                <strong>{tooltip.segment.ticker}</strong>
                {tooltip.segment.companyName ? (
                  <small>{tooltip.segment.companyName}</small>
                ) : null}
                <span>{formatPercent(tooltip.segment.percent, language)}</span>
                <small>
                  {formatCurrency(tooltip.segment.currentValue, currency, language)}
                </small>
              </div>
            ) : null}
          </div>
          <ul className="portfolio-allocation-list" aria-label={t.allocationLegend}>
            {segments.map((segment) => (
              <li key={segment.ticker}>
                <span
                  aria-hidden="true"
                  className="portfolio-allocation-marker"
                  style={{ "--segment-color": segment.color } as CSSProperties}
                />
                <div>
                  <strong>{segment.ticker}</strong>
                  {segment.companyName ? <small>{segment.companyName}</small> : null}
                </div>
                <span>
                  {formatPercent(segment.percent, language)}
                  <small>
                    {formatCurrency(segment.currentValue, currency, language)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function buildAllocationSegments(
  positions: PortfolioPositionDto[],
  totalCurrentValue: number,
): AllocationSegment[] {
  if (totalCurrentValue <= 0) {
    return [];
  }

  let accumulatedPercent = 0;
  const allocationPositions = positions.filter(
    (position) => position.currentValue > 0,
  );

  return allocationPositions
    .map((position, index) => {
      const percent = (position.currentValue / totalCurrentValue) * 100;
      const startPercent = accumulatedPercent;
      const endPercent =
        index === allocationPositions.length - 1
          ? 100
          : accumulatedPercent + percent;

      accumulatedPercent = endPercent;

      return {
        color: allocationColors[index % allocationColors.length],
        companyName: position.companyName,
        currentValue: position.currentValue,
        endPercent,
        percent,
        startPercent,
        ticker: position.ticker,
      };
    });
}

function describePieSegment(startPercent: number, endPercent: number): string {
  const center = 110;
  const radius = 74;

  if (endPercent - startPercent >= 99.999) {
    return [
      `M ${center} ${center}`,
      `m 0 -${radius}`,
      `a ${radius} ${radius} 0 1 1 0 ${radius * 2}`,
      `a ${radius} ${radius} 0 1 1 0 -${radius * 2}`,
      "Z",
    ].join(" ");
  }

  const start = pointOnCircle(center, radius, startPercent);
  const end = pointOnCircle(center, radius, endPercent);
  const largeArcFlag = endPercent - startPercent > 50 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function pointOnCircle(
  center: number,
  radius: number,
  percent: number,
): { x: number; y: number } {
  const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;

  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function getSegmentTooltipPosition(segment: AllocationSegment): {
  x: number;
  y: number;
} {
  const midpointPercent = (segment.startPercent + segment.endPercent) / 2;
  const point = pointOnCircle(110, 58, midpointPercent);

  return {
    x: (point.x / 220) * 100,
    y: (point.y / 220) * 100,
  };
}

function formatAllocationLabel(
  segment: AllocationSegment,
  currency: string,
  language: ProfileLanguage,
): string {
  const companyName = segment.companyName ? `, ${segment.companyName}` : "";

  return `${segment.ticker}${companyName}: ${formatPercent(
    segment.percent,
    language,
  )}, ${formatCurrency(segment.currentValue, currency, language)}`;
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
  onEdit: (position: PortfolioPositionDto) => void;
  positions: PortfolioPositionDto[];
  t: Dictionary;
}

function PositionsTable({
  language,
  onEdit,
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
                    <Button variant="outline" onClick={() => onEdit(position)}>
                      {t.edit}
                    </Button>
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
  const [notes, setNotes] = useState("");
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
      notes: notes.trim() || undefined,
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
          <div className="profile-field profile-field-full">
            <Label htmlFor="portfolio-notes">{t.notes}</Label>
            <Input
              id="portfolio-notes"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
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

function PortfolioActionModal({
  accessToken,
  language,
  position,
  t,
  onClose,
  onSuccess,
}: {
  accessToken: string;
  language: ProfileLanguage;
  position: PortfolioPositionDto;
  t: Dictionary;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<PortfolioAction>("add");
  const [deleteMode, setDeleteMode] = useState<DeletePositionMode>("close");
  const invalidatePortfolioData = async () => {
    await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
    await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
  };
  const tickerTransactionsQuery = useQuery({
    queryKey: ["transactions", { ticker: position.ticker }],
    queryFn: () => fetchTransactions(accessToken, { ticker: position.ticker }),
    enabled: Boolean(accessToken),
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: (input: CreatePortfolioTransactionRequest) =>
      createTransaction(accessToken, input),
    onSuccess: async () => {
      await invalidatePortfolioData();
      onSuccess();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdatePortfolioTransactionRequest;
    }) => updateTransaction(accessToken, id, input),
    onSuccess: async () => {
      await invalidatePortfolioData();
      onSuccess();
    },
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  useModalEffects(onClose);

  return (
    <div className="stock-modal-backdrop">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal"
        role="dialog"
      >
        <div className="portfolio-action-header">
          <div>
            <h2 id={headingId}>{t.portfolioActions}</h2>
            <p>
              <strong>{position.ticker}</strong>
              {position.companyName ? ` · ${position.companyName}` : ""}
            </p>
          </div>
          <span>{formatNumber(position.quantity, language)} {t.sharesHeld}</span>
        </div>

        <div className="profile-field profile-field-full">
          <Label htmlFor="portfolio-action-type">{t.action}</Label>
          <Select
            disabled={isPending}
            id="portfolio-action-type"
            onChange={(event) => setAction(event.target.value as PortfolioAction)}
            value={action}
          >
            <option value="add">{t.addPurchase}</option>
            <option value="edit">{t.editTransaction}</option>
            <option value="sell">{t.sellShares}</option>
            <option value="delete">{t.deletePosition}</option>
          </Select>
        </div>

        {action === "add" ? (
          <PortfolioTransactionForm
            defaultCurrency={position.currency}
            defaultDate={getCurrentLocalDateTime()}
            defaultPrice=""
            defaultQuantity=""
            error={createMutation.error}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={(values) =>
              createMutation.mutate({
                ticker: position.ticker,
                companyName: position.companyName,
                type: "BUY",
                quantity: values.quantity,
                price: values.price,
                currency: values.currency,
                transactionDate: values.transactionDate,
                notes: values.notes,
              })
            }
            priceLabel={t.price}
            quantityLabel={t.quantity}
            saveLabel={t.savePurchase}
            t={t}
            readonlyCompanyName={position.companyName}
            readonlyTicker={position.ticker}
          />
        ) : null}

        {action === "edit" ? (
          <PortfolioTransactionEditPanel
            error={updateMutation.error}
            isPending={isPending}
            language={language}
            onCancel={onClose}
            onSubmit={(transaction, values) =>
              updateMutation.mutate({
                id: transaction.id,
                input: {
                  quantity: values.quantity,
                  price: values.price,
                  currency: values.currency,
                  transactionDate: values.transactionDate,
                  notes: values.notes,
                },
              })
            }
            queryError={tickerTransactionsQuery.error}
            queryIsLoading={tickerTransactionsQuery.isLoading}
            t={t}
            transactions={tickerTransactionsQuery.data ?? []}
          />
        ) : null}

        {action === "sell" ? (
          <PortfolioSellForm
            error={createMutation.error}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={(values) =>
              createMutation.mutate({
                ticker: position.ticker,
                companyName: position.companyName,
                type: "SELL",
                quantity: values.quantity,
                price: values.price,
                currency: values.currency,
                transactionDate: values.transactionDate,
                notes: values.notes,
              })
            }
            position={position}
            t={t}
          />
        ) : null}

        {action === "delete" ? (
          <div className="portfolio-delete-options">
            <div className="profile-field profile-field-full">
              <Label htmlFor="portfolio-delete-mode">{t.deleteOption}</Label>
              <Select
                disabled={isPending}
                id="portfolio-delete-mode"
                onChange={(event) =>
                  setDeleteMode(event.target.value as DeletePositionMode)
                }
                value={deleteMode}
              >
                <option value="partial">{t.soldSomeQuantity}</option>
                <option value="close">{t.closePosition}</option>
              </Select>
            </div>
            {deleteMode === "partial" ? (
              <PortfolioSellForm
                error={createMutation.error}
                isPending={isPending}
                onCancel={onClose}
                onSubmit={(values) =>
                  createMutation.mutate({
                    ticker: position.ticker,
                    companyName: position.companyName,
                    type: "SELL",
                    quantity: values.quantity,
                    price: values.price,
                    currency: values.currency,
                    transactionDate: values.transactionDate,
                    notes: values.notes,
                  })
                }
                position={position}
                t={t}
              />
            ) : (
              <PortfolioTransactionForm
                defaultCurrency={position.currency}
                defaultDate={getCurrentLocalDateTime()}
                defaultPrice={String(position.currentPrice)}
                defaultQuantity={String(position.quantity)}
                error={createMutation.error}
                fixedQuantity
                helperText={t.closePositionHelp}
                isPending={isPending}
                onCancel={onClose}
                onSubmit={(values) =>
                  createMutation.mutate({
                    ticker: position.ticker,
                    companyName: position.companyName,
                    type: "SELL",
                    quantity: position.quantity,
                    price: values.price,
                    currency: values.currency,
                    transactionDate: values.transactionDate,
                    notes: values.notes,
                  })
                }
                priceLabel={t.sellPrice}
                quantityLabel={t.quantityToSell}
                saveLabel={t.closePosition}
                t={t}
              />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

interface PortfolioTransactionFormValues {
  quantity: number;
  price: number;
  currency: string;
  transactionDate: string;
  notes?: string;
}

function PortfolioTransactionEditPanel({
  error,
  isPending,
  language,
  queryError,
  queryIsLoading,
  transactions,
  t,
  onCancel,
  onSubmit,
}: {
  error: Error | null;
  isPending: boolean;
  language: ProfileLanguage;
  queryError: Error | null;
  queryIsLoading: boolean;
  transactions: PortfolioTransactionDto[];
  t: Dictionary;
  onCancel: () => void;
  onSubmit: (
    transaction: PortfolioTransactionDto,
    values: PortfolioTransactionFormValues,
  ) => void;
}) {
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const selectedTransaction =
    transactions.find((transaction) => transaction.id === selectedTransactionId) ??
    transactions[0];

  useEffect(() => {
    if (!selectedTransactionId && transactions[0]) {
      setSelectedTransactionId(transactions[0].id);
    }
  }, [selectedTransactionId, transactions]);

  if (queryIsLoading) {
    return <p role="status">{t.loadingTransactions}</p>;
  }

  if (queryError instanceof Error) {
    return <p className="error-text" role="alert">{t.transactionsLoadError}</p>;
  }

  if (!selectedTransaction) {
    return (
      <EmptyState
        description={t.transactionsEmpty}
        title={t.noTransactionsYet}
      />
    );
  }

  return (
    <>
      <div className="profile-field profile-field-full">
        <Label htmlFor="portfolio-transaction-select">{t.selectTransaction}</Label>
        <Select
          disabled={isPending}
          id="portfolio-transaction-select"
          onChange={(event) => setSelectedTransactionId(event.target.value)}
          value={selectedTransaction.id}
        >
          {transactions.map((transaction) => (
            <option key={transaction.id} value={transaction.id}>
              {transaction.type} · {formatNumber(transaction.quantity, language)} ·{" "}
              {formatTransactionDate(transaction.transactionDate, language)}
            </option>
          ))}
        </Select>
      </div>
      <PortfolioTransactionForm
        defaultCurrency={selectedTransaction.currency}
        defaultDate={formatDateTimeLocalValue(
          new Date(selectedTransaction.transactionDate),
        )}
        defaultNotes={selectedTransaction.notes ?? ""}
        defaultPrice={String(selectedTransaction.price)}
        defaultQuantity={String(selectedTransaction.quantity)}
        error={error}
        formKey={selectedTransaction.id}
        isPending={isPending}
        onCancel={onCancel}
        onSubmit={(values) => onSubmit(selectedTransaction, values)}
        priceLabel={t.price}
        quantityLabel={t.quantity}
        saveLabel={t.saveTransaction}
        t={t}
      />
    </>
  );
}

function PortfolioSellForm({
  error,
  isPending,
  position,
  t,
  onCancel,
  onSubmit,
}: {
  error: Error | null;
  isPending: boolean;
  position: PortfolioPositionDto;
  t: Dictionary;
  onCancel: () => void;
  onSubmit: (values: PortfolioTransactionFormValues) => void;
}) {
  return (
    <PortfolioTransactionForm
      defaultCurrency={position.currency}
      defaultDate={getCurrentLocalDateTime()}
      defaultPrice={String(position.currentPrice)}
      defaultQuantity=""
      error={error}
      isPending={isPending}
      maxQuantity={position.quantity}
      onCancel={onCancel}
      onSubmit={onSubmit}
      priceLabel={t.sellPrice}
      quantityLabel={t.quantityToSell}
      saveLabel={t.sellShares}
      t={t}
    />
  );
}

function PortfolioTransactionForm({
  defaultCurrency,
  defaultDate,
  defaultNotes = "",
  defaultPrice,
  defaultQuantity,
  error,
  fixedQuantity = false,
  formKey,
  helperText,
  isPending,
  maxQuantity,
  priceLabel,
  readonlyCompanyName,
  readonlyTicker,
  quantityLabel,
  saveLabel,
  t,
  onCancel,
  onSubmit,
}: {
  defaultCurrency: string;
  defaultDate: string;
  defaultNotes?: string;
  defaultPrice: string;
  defaultQuantity: string;
  error: Error | null;
  fixedQuantity?: boolean;
  formKey?: string;
  helperText?: string;
  isPending: boolean;
  maxQuantity?: number;
  priceLabel: string;
  readonlyCompanyName?: string;
  readonlyTicker?: string;
  quantityLabel: string;
  saveLabel: string;
  t: Dictionary;
  onCancel: () => void;
  onSubmit: (values: PortfolioTransactionFormValues) => void;
}) {
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [price, setPrice] = useState(defaultPrice);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [transactionDate, setTransactionDate] = useState(defaultDate);
  const [notes, setNotes] = useState(defaultNotes);
  const [formError, setFormError] = useState<string | null>(null);
  const latestTransactionDate = getCurrentLocalDateTime();

  useEffect(() => {
    setQuantity(defaultQuantity);
    setPrice(defaultPrice);
    setCurrency(defaultCurrency);
    setTransactionDate(defaultDate);
    setNotes(defaultNotes);
    setFormError(null);
  }, [defaultCurrency, defaultDate, defaultNotes, defaultPrice, defaultQuantity, formKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    const parsedTransactionDate = new Date(transactionDate);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError(t.quantityGreaterThanZeroError);
      return;
    }

    if (maxQuantity !== undefined && parsedQuantity > maxQuantity) {
      setFormError(t.sellQuantityExceedsPositionError);
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setFormError(t.priceGreaterThanZeroError);
      return;
    }

    if (
      Number.isNaN(parsedTransactionDate.getTime()) ||
      parsedTransactionDate.getTime() > Date.now()
    ) {
      setFormError(t.futureTransactionDateError);
      return;
    }

    onSubmit({
      quantity: parsedQuantity,
      price: parsedPrice,
      currency,
      transactionDate: parsedTransactionDate.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <form className="portfolio-form" onSubmit={handleSubmit}>
      {helperText ? (
        <p className="portfolio-form-help profile-field-full">{helperText}</p>
      ) : null}
      {readonlyTicker ? (
        <div className="profile-field">
          <Label htmlFor="portfolio-action-ticker">{t.ticker}</Label>
          <Input
            disabled
            id="portfolio-action-ticker"
            value={readonlyTicker}
          />
        </div>
      ) : null}
      {readonlyCompanyName ? (
        <div className="profile-field">
          <Label htmlFor="portfolio-action-company">{t.companyName}</Label>
          <Input
            disabled
            id="portfolio-action-company"
            value={readonlyCompanyName}
          />
        </div>
      ) : null}
      <div className="profile-field">
        <Label htmlFor="portfolio-action-quantity">{quantityLabel}</Label>
        <Input
          disabled={fixedQuantity || isPending}
          id="portfolio-action-quantity"
          max={maxQuantity}
          min="0.00000001"
          onChange={(event) => setQuantity(event.target.value)}
          required
          step="any"
          type="number"
          value={quantity}
        />
      </div>
      <div className="profile-field">
        <Label htmlFor="portfolio-action-price">{priceLabel}</Label>
        <Input
          disabled={isPending}
          id="portfolio-action-price"
          min="0.00000001"
          onChange={(event) => setPrice(event.target.value)}
          required
          step="any"
          type="number"
          value={price}
        />
      </div>
      <div className="profile-field">
        <Label htmlFor="portfolio-action-currency">{t.currency}</Label>
        <Input
          disabled={isPending}
          id="portfolio-action-currency"
          maxLength={3}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
          required
          value={currency}
        />
      </div>
      <div className="profile-field">
        <Label htmlFor="portfolio-action-date">{t.transactionDate}</Label>
        <Input
          disabled={isPending}
          id="portfolio-action-date"
          max={latestTransactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          required
          step="60"
          type="datetime-local"
          value={transactionDate}
        />
      </div>
      <div className="profile-field profile-field-full">
        <Label htmlFor="portfolio-action-notes">{t.notes}</Label>
        <Input
          disabled={isPending}
          id="portfolio-action-notes"
          onChange={(event) => setNotes(event.target.value)}
          value={notes}
        />
      </div>
      <div className="portfolio-modal-actions profile-field-full">
        <Button disabled={isPending} type="submit">
          {isPending ? t.saving : saveLabel}
        </Button>
        <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
          {t.cancel}
        </Button>
      </div>
      {formError ? <p className="error-text profile-field-full" role="alert">{formError}</p> : null}
      {error instanceof Error ? (
        <p className="error-text profile-field-full" role="alert">
          {t.portfolioActionError}
        </p>
      ) : null}
    </form>
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

function formatTransactionDate(
  value: string,
  language: ProfileLanguage,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
