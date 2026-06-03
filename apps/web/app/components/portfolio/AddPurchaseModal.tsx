"use client";

import type {
  CreatePortfolioPositionRequest,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import type { Dictionary } from "../../dictionaries";
import { fetchMarketQuote, searchMarketSymbols } from "../../lib/market-data-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface AddPurchasePrefill {
  companyName?: string;
  currency?: string;
  ticker: string;
}

interface AddPurchaseModalProps {
  accessToken: string;
  error: Error | null;
  initialStock?: AddPurchasePrefill;
  isPending: boolean;
  t: Dictionary;
  onClose: () => void;
  onSubmit: (input: CreatePortfolioPositionRequest) => void;
}

export function AddPurchaseModal({
  accessToken,
  error,
  initialStock,
  isPending,
  t,
  onClose,
  onSubmit,
}: AddPurchaseModalProps) {
  const headingId = useId();
  const normalizedInitialTicker = initialStock?.ticker.trim().toUpperCase() ?? "";
  const initialCompanyName =
    initialStock?.companyName?.trim() || normalizedInitialTicker;
  const [searchInput, setSearchInput] = useState(normalizedInitialTicker);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    normalizedInitialTicker
      ? {
          ticker: normalizedInitialTicker,
          name: initialCompanyName,
          currency: initialStock?.currency ?? "USD",
          exchange: "",
          type: "",
        }
      : null,
  );
  const [quantity, setQuantity] = useState("");
  const [averagePurchasePrice, setAveragePurchasePrice] = useState("");
  const [currency, setCurrency] = useState(initialStock?.currency ?? "USD");
  const [purchaseDate, setPurchaseDate] = useState(getCurrentLocalDateTime());
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isPrefilled = Boolean(normalizedInitialTicker);
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), 350);
  const searchQuery = useQuery({
    queryKey: ["market-data", "search", debouncedSearchInput],
    queryFn: () => searchMarketSymbols(accessToken, debouncedSearchInput),
    enabled:
      !isPrefilled && !selectedStock && debouncedSearchInput.length >= 2,
    retry: false,
  });
  const quoteMutation = useMutation({
    mutationFn: (ticker: string) => fetchMarketQuote(accessToken, ticker),
    onSuccess: (quote) => {
      setAveragePurchasePrice(String(quote.currentPrice));
      setCurrency(quote.currency || initialStock?.currency || "USD");
    },
  });
  const prefilledQuoteQuery = useQuery({
    queryKey: ["market-data", "quote", normalizedInitialTicker],
    queryFn: () => fetchMarketQuote(accessToken, normalizedInitialTicker),
    enabled: isPrefilled && Boolean(accessToken),
    retry: false,
  });
  const latestPurchaseDate = getCurrentLocalDateTime();

  useModalEffects(onClose);

  useEffect(() => {
    if (prefilledQuoteQuery.data) {
      setAveragePurchasePrice(String(prefilledQuoteQuery.data.currentPrice));
      setCurrency(
        prefilledQuoteQuery.data.currency || initialStock?.currency || "USD",
      );
    }
  }, [initialStock?.currency, prefilledQuoteQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStock) {
      setFormError(t.chooseStockError);
      return;
    }

    const parsedQuantity = Number(quantity);
    const parsedAveragePurchasePrice = Number(averagePurchasePrice);
    const parsedPurchaseDate = new Date(purchaseDate);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError(t.quantityGreaterThanZeroError);
      return;
    }

    if (
      !Number.isFinite(parsedAveragePurchasePrice) ||
      parsedAveragePurchasePrice <= 0
    ) {
      setFormError(t.priceGreaterThanZeroError);
      return;
    }

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
      quantity: parsedQuantity,
      averagePurchasePrice: parsedAveragePurchasePrice,
      currency,
      purchaseDate: parsedPurchaseDate.toISOString(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="stock-modal-backdrop stock-modal-backdrop-stacked">
      <section
        aria-labelledby={headingId}
        aria-modal="true"
        className="stock-modal portfolio-modal"
        role="dialog"
      >
        <h2 id={headingId}>{t.addPurchase}</h2>
        <form className="portfolio-form" onSubmit={handleSubmit}>
          <div className="profile-field profile-field-full stock-search">
            <Label htmlFor="portfolio-ticker">{t.ticker}</Label>
            <Input
              autoComplete="off"
              disabled={isPrefilled || isPending}
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
            {!isPrefilled && !selectedStock && debouncedSearchInput.length >= 2 ? (
              <PositionSearchResults
                error={searchQuery.error}
                isLoading={searchQuery.isPending}
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
          {isPrefilled ? (
            <div className="profile-field profile-field-full">
              <Label htmlFor="portfolio-company-name">{t.companyName}</Label>
              <Input
                disabled
                id="portfolio-company-name"
                value={selectedStock?.name || t.companyNameNotSet}
              />
            </div>
          ) : null}
          <div className="profile-field">
            <Label htmlFor="portfolio-quantity">{t.quantity}</Label>
            <Input
              disabled={isPending}
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
              disabled={isPending}
              id="portfolio-average-price"
              min="0.00000001"
              onChange={(event) => setAveragePurchasePrice(event.target.value)}
              required
              step="any"
              type="number"
              value={averagePurchasePrice}
            />
            {quoteMutation.isPending || prefilledQuoteQuery.isLoading ? (
              <small className="portfolio-field-status">{t.loadingCurrentPrice}</small>
            ) : quoteMutation.error instanceof Error ||
              prefilledQuoteQuery.error instanceof Error ? (
              <small className="portfolio-field-status error-text">
                {t.currentPricePresetError}
              </small>
            ) : null}
          </div>
          <div className="profile-field">
            <Label htmlFor="portfolio-currency">{t.currency}</Label>
            <Input
              disabled={isPending}
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
              disabled={isPending}
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
              disabled={isPending}
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

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
