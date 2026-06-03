"use client";

import type {
  CreatePortfolioPositionRequest,
  CreatePortfolioTransactionRequest,
  PortfolioAllocationDto,
  PortfolioDto,
  PortfolioPositionDto,
  PortfolioTransactionDto,
  UpdatePortfolioTransactionRequest,
  ProfileLanguage,
} from "@ai-stock-advisor/shared";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";
import { AppHeader } from "../components/layout/AppHeader";
import { AddPurchaseModal } from "../components/portfolio/AddPurchaseModal";
import { CompanyLogo } from "../components/stocks/CompanyLogo";
import { StockDetailsModal } from "../components/stocks/StockDetailsModal";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { PaginationControls } from "../components/ui/PaginationControls";
import { Select } from "../components/ui/select";
import type { Dictionary } from "../dictionaries";
import {
  resolveValidPage,
  shouldShowPagination,
} from "../lib/pagination-state";
import {
  createPortfolioPosition,
  fetchPortfolioAllocation,
  fetchPortfolio,
} from "../lib/portfolio-api";
import {
  buildPortfolioQueryKey,
  buildPortfolioQueryState,
} from "../lib/portfolio-query-state";
import {
  createTransaction,
  fetchTransactions,
  updateTransaction,
} from "../lib/transactions-api";
import {
  buildTransactionsQueryKey,
  buildTransactionsQueryState,
  toTransactionFilters,
} from "../lib/transactions-query-state";
import {
  formatCurrency,
  formatPercent,
  getChangeVariant,
} from "../lib/stock-format";

const portfolioQueryKey = ["portfolio"] as const;
const transactionsQueryKey = ["transactions"] as const;
const tablePageSize = 10;

type PortfolioAction = "add" | "edit" | "sell" | "delete";
type DeletePositionMode = "partial" | "close";

export function PortfolioPage() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { language, t } = useI18n();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [actionPosition, setActionPosition] =
    useState<PortfolioPositionDto | null>(null);
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const portfolioQueryState = buildPortfolioQueryState({
    page: currentPage,
    limit: tablePageSize,
  });

  const portfolioQuery = useQuery({
    queryKey: buildPortfolioQueryKey(portfolioQueryState),
    queryFn: () =>
      fetchPortfolio(accessToken ?? "", portfolioQueryState),
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
    refetchInterval: 2 * 60 * 1_000,
    retry: false,
  });
  const allocationQuery = useQuery({
    queryKey: ["portfolio", "allocation"],
    queryFn: () => fetchPortfolioAllocation(accessToken ?? ""),
    enabled: Boolean(accessToken),
    refetchInterval: 2 * 60 * 1_000,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePortfolioPositionRequest) =>
      createPortfolioPosition(accessToken ?? "", input),
    onSuccess: async () => {
      setIsAddOpen(false);
      setCurrentPage(1);
      setStatusMessage(t.portfolioActionSuccess);
      await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
    },
  });

  const portfolio = portfolioQuery.data;
  const positions = portfolio?.items ?? [];
  const paginationMeta = portfolio?.meta;
  const showPagination = shouldShowPagination(paginationMeta, tablePageSize);
  const summaryCurrency = positions[0]?.currency ?? "USD";

  useEffect(() => {
    const validPage = resolveValidPage(currentPage, paginationMeta);

    if (validPage !== currentPage) {
      setCurrentPage(validPage);
    }
  }, [currentPage, paginationMeta]);

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
        <PortfolioOverview
          allocation={allocationQuery.data}
          allocationError={allocationQuery.error}
          currency={summaryCurrency}
          isAllocationLoading={allocationQuery.isLoading}
          isPortfolioLoading={portfolioQuery.isLoading}
          language={language}
          portfolio={portfolio}
          portfolioError={
            portfolioQuery.error instanceof Error ? portfolioQuery.error : null
          }
          t={t}
        />
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
          <>
            <PositionsTable
              language={language}
              onEdit={(position) => {
                setStatusMessage(null);
                setActionPosition(position);
              }}
              onOpenStock={setDetailsTicker}
              positions={positions}
              t={t}
            />
            {showPagination && paginationMeta ? (
              <PaginationControls
                ariaLabel={t.paginationNavigation}
                currentPage={currentPage}
                isBusy={portfolioQuery.isFetching}
                nextLabel={t.paginationNext}
                onNext={() => setCurrentPage((page) => page + 1)}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                pageLabel={t.paginationPageIndicator}
                previousLabel={t.paginationPrevious}
                totalPages={paginationMeta.totalPages}
              />
            ) : null}
          </>
        )}
        {statusMessage ? (
          <p className="portfolio-action-status" role="status">
            {statusMessage}
          </p>
        ) : null}
      </section>

      {isAddOpen ? (
        <AddPurchaseModal
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
          onDataRefresh={() => setCurrentPage(1)}
          onSuccess={() => {
            setActionPosition(null);
            setStatusMessage(t.portfolioActionSuccess);
          }}
          position={actionPosition}
          t={t}
        />
      ) : null}
      {detailsTicker ? (
        <StockDetailsModal
          onClose={() => setDetailsTicker(null)}
          open={Boolean(detailsTicker)}
          ticker={detailsTicker}
        />
      ) : null}
    </main>
  );
}

interface PortfolioOverviewProps {
  allocation?: PortfolioAllocationDto;
  allocationError: Error | null;
  currency: string;
  isAllocationLoading: boolean;
  isPortfolioLoading: boolean;
  language: ProfileLanguage;
  portfolio?: PortfolioDto;
  portfolioError: Error | null;
  t: Dictionary;
}

function PortfolioOverview({
  allocation,
  allocationError,
  currency,
  isAllocationLoading,
  isPortfolioLoading,
  language,
  portfolio,
  portfolioError,
  t,
}: PortfolioOverviewProps) {
  return (
    <div className="portfolio-overview-grid">
      {isPortfolioLoading ? (
        <div>
          <p role="status">{t.loadingPortfolio}</p>
        </div>
      ) : portfolioError ? (
        <div>
          <p className="error-text" role="alert">
            {t.portfolioLoadError}
          </p>
        </div>
      ) : portfolio ? (
        <PortfolioSummary
          currency={currency}
          language={language}
          portfolio={portfolio}
          t={t}
        />
      ) : null}
      <PortfolioAllocationChart
        allocation={allocation}
        error={allocationError}
        isLoading={isAllocationLoading}
        currency={currency}
        language={language}
        t={t}
      />
    </div>
  );
}

function PortfolioSummary({
  currency,
  language,
  portfolio,
  t,
}: {
  currency: string;
  language: ProfileLanguage;
  portfolio: PortfolioDto;
  t: Dictionary;
}) {
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
  allocation?: PortfolioAllocationDto;
  currency: string;
  error: Error | null;
  isLoading: boolean;
  language: ProfileLanguage;
  t: Dictionary;
}

interface AllocationSegment {
  color: string;
  endPercent: number;
  percent: number;
  startPercent: number;
  ticker: string;
  value: number;
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
  allocation,
  currency,
  error,
  isLoading,
  language,
  t,
}: PortfolioAllocationChartProps) {
  const chartTitleId = useId();
  const chartDescriptionId = useId();
  const tooltipId = useId();
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<AllocationTooltip | null>(null);
  const segments = buildAllocationSegments(allocation);

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
      {isLoading ? (
        <p className="portfolio-allocation-status" role="status">
          {t.loadingPortfolio}
        </p>
      ) : error ? (
        <p className="portfolio-allocation-status error-text" role="alert">
          {t.portfolioLoadError}
        </p>
      ) : segments.length === 0 ? (
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
                <span>{formatPercent(tooltip.segment.percent, language)}</span>
                <small>
                  {formatCurrency(tooltip.segment.value, currency, language)}
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
                </div>
                <span>
                  {formatPercent(segment.percent, language)}
                  <small>
                    {formatCurrency(segment.value, currency, language)}
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
  allocation: PortfolioAllocationDto | undefined,
): AllocationSegment[] {
  if (!allocation || allocation.totalPortfolioValue <= 0) {
    return [];
  }

  let accumulatedPercent = 0;
  const allocationItems = allocation.allocations.filter(
    (item) => item.value > 0,
  );

  return allocationItems
    .map((item, index) => {
      const percent = item.percentage;
      const startPercent = accumulatedPercent;
      const endPercent =
        index === allocationItems.length - 1
          ? 100
          : accumulatedPercent + percent;

      accumulatedPercent = endPercent;

      return {
        color: allocationColors[index % allocationColors.length],
        endPercent,
        percent,
        startPercent,
        ticker: item.ticker,
        value: item.value,
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
  return `${segment.ticker}: ${formatPercent(
    segment.percent,
    language,
  )}, ${formatCurrency(segment.value, currency, language)}`;
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
  onOpenStock: (ticker: string) => void;
  positions: PortfolioPositionDto[];
  t: Dictionary;
}

function PositionsTable({
  language,
  onEdit,
  onOpenStock,
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
              <tr
                className="portfolio-table-row-open"
                key={position.ticker}
                onClick={() => onOpenStock(position.ticker)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }

                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenStock(position.ticker);
                  }
                }}
              >
                <td>
                  <div className="stock-table-identity">
                    <CompanyLogo
                      className="company-logo--table"
                      companyName={position.companyName}
                      ticker={position.ticker}
                    />
                    <div className="stock-table-identity-text">
                      <strong>{position.ticker}</strong>
                      <small>{position.companyName}</small>
                    </div>
                  </div>
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
                    <Button
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(position);
                      }}
                    >
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

function PortfolioActionModal({
  accessToken,
  language,
  position,
  t,
  onClose,
  onDataRefresh,
  onSuccess,
}: {
  accessToken: string;
  language: ProfileLanguage;
  position: PortfolioPositionDto;
  t: Dictionary;
  onClose: () => void;
  onDataRefresh: () => void;
  onSuccess: () => void;
}) {
  const headingId = useId();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<PortfolioAction>("add");
  const [deleteMode, setDeleteMode] = useState<DeletePositionMode>("close");
  const tickerTransactionsQueryState = buildTransactionsQueryState({
    page: 1,
    limit: 100,
    ticker: position.ticker,
    fromDate: "",
    toDate: "",
  });
  const invalidatePortfolioData = async () => {
    onDataRefresh();
    await queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
    await queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
  };
  const tickerTransactionsQuery = useQuery({
    queryKey: buildTransactionsQueryKey(tickerTransactionsQueryState),
    queryFn: () =>
      fetchTransactions(accessToken, toTransactionFilters(tickerTransactionsQueryState)),
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
            transactions={tickerTransactionsQuery.data?.items ?? []}
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
