"use client";

import type {
  CompanyProfile,
  CreatePortfolioPositionRequest,
  MarketMoversResponse,
  PortfolioDto,
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
import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  AddPurchaseModal,
  type AddPurchasePrefill,
} from "../portfolio/AddPurchaseModal";
import { useI18n } from "../i18n/I18nProvider";
import type { Dictionary } from "../../dictionaries";
import {
  fetchStockCandles,
  fetchStockDetails,
} from "../../lib/market-data-api";
import { createPortfolioPosition } from "../../lib/portfolio-api";
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from "../../lib/watchlist-api";
import { CompanyInfoTab } from "./CompanyInfoTab";
import { StockChartTab } from "./StockChartTab";
import { StockDetailsHeader } from "./StockDetailsHeader";
import { StockDetailsTabs } from "./StockDetailsTabs";
import { StockInfoTab } from "./StockInfoTab";
import type { StockDetailsTabValue } from "./stock-details-types";

interface StockDetailsModalProps {
  initialCompanyName?: string;
  initialLogoUrl?: string;
  onClose: () => void;
  open: boolean;
  ticker: string;
}

const portfolioQueryKey = ["portfolio"] as const;
const portfolioAllocationQueryKey = ["portfolio", "allocation"] as const;
const portfolioPerformanceQueryKey = ["portfolio", "performance"] as const;
const transactionsQueryKey = ["transactions"] as const;

async function invalidatePortfolioAndTransactions(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ exact: true, queryKey: portfolioQueryKey }),
    queryClient.invalidateQueries({ queryKey: portfolioAllocationQueryKey }),
    queryClient.invalidateQueries({ queryKey: portfolioPerformanceQueryKey }),
    queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
  ]);
}

export function StockDetailsModal({
  initialCompanyName,
  initialLogoUrl,
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
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const [activeTab, setActiveTab] = useState<StockDetailsTabValue>("chart");
  const [range, setRange] = useState<StockCandleRange>("1d");
  const [isClosing, setIsClosing] = useState(false);
  const [purchasePrefill, setPurchasePrefill] =
    useState<AddPurchasePrefill | null>(null);
  const normalizedTicker = ticker.trim().toUpperCase();
  const watchlistQueryKey = ["watchlist"] as const;
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
  const details = detailsQuery.data;
  const candles = candlesQuery.data ?? [];
  const companyName =
    details?.name ??
    initialCompanyName ??
    getCachedCompanyName(queryClient, normalizedTicker) ??
    t.companyNameNotSet;
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
      await invalidatePortfolioAndTransactions(queryClient);
      setPurchasePrefill(null);
      onCloseRef.current();
    },
  });
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

  const requestClose = useCallback(() => {
    if (closeTimerRef.current) {
      return;
    }

    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      onCloseRef.current();
    }, 170);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab("chart");
      setRange("1d");
      setIsClosing(false);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [open, normalizedTicker]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || normalizedTicker.length === 0 || purchasePrefill) {
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
        requestClose();
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
  }, [open, normalizedTicker, purchasePrefill, requestClose]);

  if (!open || normalizedTicker.length === 0) {
    return null;
  }

  if (purchasePrefill) {
    return typeof document === "undefined"
      ? null
      : createPortal(
          <AddPurchaseModal
            accessToken={accessToken ?? ""}
            error={createPurchaseMutation.error}
            initialStock={purchasePrefill}
            isPending={createPurchaseMutation.isPending}
            onClose={() => {
              setPurchasePrefill(null);
              onCloseRef.current();
            }}
            onSubmit={(input) => createPurchaseMutation.mutate(input)}
            t={t}
          />,
          document.body,
        );
  }

  return (
    <div
      className={[
        "stock-modal-backdrop",
        isClosing ? "stock-modal-backdrop-closing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        if (event.currentTarget === event.target) {
          requestClose();
        }
      }}
    >
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className={["stock-modal", isClosing ? "stock-modal-closing" : ""]
          .filter(Boolean)
          .join(" ")}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <StockDetailsHeader
          companyName={companyName}
          currency={details?.currency}
          exchange={details?.exchange}
          headingId={headingId}
          isWatchlisted={Boolean(watchlistItem)}
          isWatchlistPending={isWatchlistMutationPending || watchlistQuery.isLoading}
          logoUrl={details?.logoUrl ?? initialLogoUrl}
          onAddPurchase={() => {
            setPurchasePrefill({
              ticker: normalizedTicker,
              companyName: getActionCompanyName(companyName, t),
              currency: details?.currency,
            });
          }}
          onClose={requestClose}
          onToggleWatchlist={() => {
            if (watchlistItem) {
              removeWatchlistMutation.mutate(watchlistItem.id);
              return;
            }

            addWatchlistMutation.mutate();
          }}
          onViewTransactions={() => {
            const target = `/transactions?ticker=${encodeURIComponent(
              normalizedTicker,
            )}`;

            if (pathname === "/transactions") {
              router.replace(target);
            } else {
              router.push(target);
            }
          }}
          t={t}
          ticker={normalizedTicker}
        />
        {watchlistActionError ? (
          <p className="stock-modal-inline-error error-text" role="alert">
            {watchlistActionError}
          </p>
        ) : null}
        <StockDetailsTabs
          chartContent={
            <StockChartTab
              candles={candles}
              currency={details?.currency}
              isError={candlesQuery.error instanceof Error}
              isLoading={candlesQuery.isLoading}
              language={language}
              onRangeChange={setRange}
              range={range}
              t={t}
            />
          }
          companyInfoContent={renderDetailsContent({
            details,
            isLoading: detailsQuery.isLoading,
            isError: detailsQuery.error instanceof Error,
            loadingMessage: t.loadingStockDetails,
            errorMessage: t.stockDetailsUnavailable,
            render: (loadedDetails) => (
              <CompanyInfoTab details={loadedDetails} language={language} t={t} />
            ),
          })}
          onValueChange={setActiveTab}
          stockInfoContent={renderDetailsContent({
            details,
            isLoading: detailsQuery.isLoading,
            isError: detailsQuery.error instanceof Error,
            loadingMessage: t.loadingStockDetails,
            errorMessage: t.stockDetailsUnavailable,
            render: (loadedDetails) => (
              <StockInfoTab details={loadedDetails} language={language} t={t} />
            ),
          })}
          t={t}
          value={activeTab}
        />
      </section>
    </div>
  );
}

interface RenderDetailsContentOptions {
  details: StockDetails | undefined;
  errorMessage: string;
  isError: boolean;
  isLoading: boolean;
  loadingMessage: string;
  render: (details: StockDetails) => ReactNode;
}

function renderDetailsContent({
  details,
  errorMessage,
  isError,
  isLoading,
  loadingMessage,
  render,
}: RenderDetailsContentOptions) {
  if (isLoading) {
    return (
      <p className="stock-details-status" role="status">
        {loadingMessage}
      </p>
    );
  }

  if (isError) {
    return (
      <p className="stock-details-status error-text" role="alert">
        {errorMessage}
      </p>
    );
  }

  return details ? render(details) : null;
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
  const companyProfile = queryClient.getQueryData<CompanyProfile>([
    "market-data",
    "company",
    ticker,
  ]);

  if (companyProfile?.name) {
    return companyProfile.name;
  }

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
    const position = portfolio?.items?.find(
      (item) => item.ticker.toUpperCase() === ticker,
    );

    if (position?.companyName) {
      return position.companyName;
    }
  }

  return undefined;
}
