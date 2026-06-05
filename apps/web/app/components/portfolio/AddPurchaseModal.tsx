"use client";

import type {
  CreatePortfolioPositionRequest,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FocusEvent, FormEvent, RefObject } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Dictionary } from "../../dictionaries";
import {
  defaultPurchaseCurrency,
  getInitialPurchaseCurrency,
  isSupportedPurchaseCurrency,
  normalizePurchaseNumberInput,
  purchaseNumberMax,
  purchaseNotesMaxLength,
  supportedPurchaseCurrencies,
  toCreatePortfolioPositionRequest,
  validateAddPurchaseForm,
  type AddPurchaseField,
  type AddPurchaseValidationMessages,
  type PurchaseCurrency,
} from "../../lib/add-purchase-validation";
import { fetchMarketQuote, searchMarketSymbols } from "../../lib/market-data-api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";

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

const purchaseCurrencyOptions = supportedPurchaseCurrencies.map((currency) => ({
  label: currency,
  value: currency,
}));

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
  const formErrorId = useId();
  const serverErrorId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const normalizedInitialTicker = initialStock?.ticker.trim().toUpperCase() ?? "";
  const initialCompanyName =
    initialStock?.companyName?.trim() || normalizedInitialTicker;
  const initialCurrency = getInitialPurchaseCurrency(
    initialStock?.currency ?? defaultPurchaseCurrency,
  );
  const [searchInput, setSearchInput] = useState(normalizedInitialTicker);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(
    normalizedInitialTicker
      ? {
          ticker: normalizedInitialTicker,
          name: initialCompanyName,
          currency: initialCurrency,
          exchange: "",
          type: "",
        }
      : null,
  );
  const [quantity, setQuantity] = useState("");
  const [averagePurchasePrice, setAveragePurchasePrice] = useState("");
  const [currency, setCurrency] = useState<PurchaseCurrency>(initialCurrency);
  const [purchaseDate, setPurchaseDate] = useState(getCurrentLocalDateTime());
  const [notes, setNotes] = useState("");
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<AddPurchaseField, boolean>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const isPrefilled = Boolean(normalizedInitialTicker);
  const trimmedSearchInput = searchInput.trim();
  const debouncedSearchInput = useDebouncedValue(trimmedSearchInput, 350);
  const validationMessages = useMemo(() => getValidationMessages(t), [t]);
  const formValues = useMemo(
    () => ({
      averagePurchasePrice,
      companyName: selectedStock?.name ?? "",
      currency,
      notes,
      purchaseDate,
      quantity,
      selectedFromSearch: Boolean(selectedStock),
      ticker: selectedStock?.ticker ?? searchInput,
    }),
    [
      averagePurchasePrice,
      currency,
      notes,
      purchaseDate,
      quantity,
      searchInput,
      selectedStock,
    ],
  );
  const validation = useMemo(
    () => validateAddPurchaseForm(formValues, validationMessages),
    [formValues, validationMessages],
  );
  const fieldErrors = validation.errors;
  const isFormValid = validation.success;
  const searchQuery = useQuery({
    queryKey: ["market-data", "search", debouncedSearchInput],
    queryFn: () => searchMarketSymbols(accessToken, debouncedSearchInput),
    enabled:
      !isPrefilled && !selectedStock && debouncedSearchInput.length >= 2,
    retry: false,
  });
  const isSearchPending = searchQuery.isPending && searchQuery.fetchStatus !== "idle";
  const showSearchStatusInControl =
    !isPrefilled &&
    !selectedStock &&
    trimmedSearchInput.length >= 2 &&
    debouncedSearchInput.length >= 2 &&
    !isSearchPending &&
    (searchQuery.error instanceof Error ||
      (searchQuery.data !== undefined && searchQuery.data.length === 0));
  const searchControlStatus = getSearchControlStatus({
    error: searchQuery.error,
    isLoading: isSearchPending,
    results: searchQuery.data,
    t,
  });
  const quoteMutation = useMutation({
    mutationFn: (ticker: string) => fetchMarketQuote(accessToken, ticker),
    onSuccess: (quote) => {
      setAveragePurchasePrice(String(quote.currentPrice));
      setCurrency(getInitialPurchaseCurrency(quote.currency || initialCurrency));
    },
  });
  const prefilledQuoteQuery = useQuery({
    queryKey: ["market-data", "quote", normalizedInitialTicker],
    queryFn: () => fetchMarketQuote(accessToken, normalizedInitialTicker),
    enabled: isPrefilled && Boolean(accessToken),
    retry: false,
  });
  const latestPurchaseDate = getCurrentLocalDateTime();

  useModalEffects(onClose, firstFieldRef);

  useEffect(() => {
    if (prefilledQuoteQuery.data) {
      setAveragePurchasePrice(String(prefilledQuoteQuery.data.currentPrice));
      setCurrency(
        getInitialPurchaseCurrency(prefilledQuoteQuery.data.currency || initialCurrency),
      );
    }
  }, [initialCurrency, prefilledQuoteQuery.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    if (!validation.success) {
      setFormError(t.addPurchaseFormValidationError);
      return;
    }

    setFormError(null);
    onSubmit(toCreatePortfolioPositionRequest(validation.data));
  };

  const markTouched = (field: AddPurchaseField) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
  };

  const normalizeNumericField = (
    event: FocusEvent<HTMLInputElement>,
    setValue: (value: string) => void,
  ) => {
    setValue(normalizePurchaseNumberInput(event.target.value));
  };

  const showFieldError = (field: AddPurchaseField) =>
    Boolean(fieldErrors[field] && touchedFields[field]);
  const getFieldError = (field: AddPurchaseField) =>
    showFieldError(field) ? fieldErrors[field] : undefined;
  const tickerError = getFieldError("ticker") ?? getFieldError("selectedFromSearch");
  const companyName = selectedStock?.name ?? "";
  const submissionError = error instanceof Error ? error.message : null;

  const clearSelectedStock = () => {
    setSearchInput("");
    setSelectedStock(null);
    setFormError(null);
    markTouched("ticker");
    markTouched("selectedFromSearch");
  };

  return (
    <div
      className="stock-modal-backdrop stock-modal-backdrop-stacked"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-labelledby={headingId}
        aria-describedby={`${formError ? formErrorId : ""} ${
          submissionError ? serverErrorId : ""
        }`.trim() || undefined}
        aria-modal="true"
        className="stock-modal portfolio-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label={t.close}
          className="stock-modal-close"
          onClick={onClose}
          type="button"
        >
          X
        </button>
        <div className="stock-modal-header">
          <div>
            <h2 id={headingId}>{t.addPurchase}</h2>
            <p>{t.requiredFieldsHelp}</p>
          </div>
        </div>
        <form className="portfolio-form" noValidate onSubmit={handleSubmit}>
          <div className="profile-field profile-field-full stock-search">
            <RequiredLabel htmlFor="portfolio-ticker" label={t.ticker} />
            <div
              aria-busy={isSearchPending}
              className={`stock-search-control ${
                tickerError ? "ui-control-invalid" : ""
              } ${isSearchPending ? "stock-search-control-busy" : ""}`.trim()}
            >
              <Input
                aria-describedby={
                  [
                    tickerError ? "portfolio-ticker-error" : "",
                    showSearchStatusInControl ? "portfolio-ticker-search-status" : "",
                  ]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                aria-disabled={isSearchPending}
                aria-invalid={Boolean(tickerError)}
                autoComplete="off"
                className="stock-search-input"
                disabled={isPrefilled || isPending}
                id="portfolio-ticker"
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setSelectedStock(null);
                  setFormError(null);
                }}
                onBlur={() => {
                  markTouched("ticker");
                  markTouched("selectedFromSearch");
                }}
                onKeyDown={(event) => {
                  if (
                    !isPrefilled &&
                    selectedStock &&
                    (event.key === "Backspace" || event.key === "Delete")
                  ) {
                    clearSelectedStock();
                  }
                }}
                placeholder={t.stockSearchPlaceholder}
                readOnly={isSearchPending}
                ref={firstFieldRef}
                required
                value={searchInput}
              />
              {isSearchPending ? (
                <>
                  <span aria-hidden="true" className="stock-search-loader" />
                  <span className="visually-hidden" role="status">
                    {t.searching}
                  </span>
                </>
              ) : null}
              {showSearchStatusInControl && searchControlStatus ? (
                <span
                  className={`stock-search-inline-status ${
                    searchQuery.error instanceof Error ? "error-text" : ""
                  }`.trim()}
                  id="portfolio-ticker-search-status"
                  role={searchQuery.error instanceof Error ? "alert" : "status"}
                >
                  {searchControlStatus}
                </span>
              ) : null}
              {!isPrefilled && searchInput ? (
                <button
                  aria-label={t.clearSearch}
                  className="stock-search-clear"
                  disabled={isPending}
                  onClick={clearSelectedStock}
                  type="button"
                >
                  X
                </button>
              ) : null}
            </div>
            <FieldError id="portfolio-ticker-error" message={tickerError} />
            {!isPrefilled &&
            !selectedStock &&
            !isSearchPending &&
            trimmedSearchInput.length >= 2 &&
            (searchQuery.data?.length ?? 0) > 0 ? (
              <PositionSearchResults
                onSelect={(stock) => {
                  setSelectedStock(stock);
                  setSearchInput(stock.ticker);
                  setCurrency(
                    isSupportedPurchaseCurrency(stock.currency)
                      ? stock.currency
                      : defaultPurchaseCurrency,
                  );
                  setAveragePurchasePrice("");
                  setFormError(null);
                  markTouched("ticker");
                  markTouched("selectedFromSearch");
                  quoteMutation.mutate(stock.ticker);
                }}
                results={searchQuery.data ?? []}
                t={t}
              />
            ) : null}
          </div>
          <div className="profile-field profile-field-full">
            <Label htmlFor="portfolio-company-name">{t.companyName}</Label>
            <Input
              disabled
              id="portfolio-company-name"
              value={companyName || t.companyNameNotSet}
            />
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="portfolio-quantity" label={t.quantity} />
            <Input
              aria-describedby={
                getFieldError("quantity") ? "portfolio-quantity-error" : undefined
              }
              aria-invalid={showFieldError("quantity")}
              className={showFieldError("quantity") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="portfolio-quantity"
              inputMode="decimal"
              onBlur={(event) => {
                markTouched("quantity");
                normalizeNumericField(event, setQuantity);
              }}
              onChange={(event) => {
                if (canAcceptPurchaseNumberInput(event.target.value)) {
                  setQuantity(event.target.value);
                  setFormError(null);
                }
              }}
              required
              type="text"
              value={quantity}
            />
            {getFieldError("quantity") ? (
              <FieldError
                id="portfolio-quantity-error"
                message={getFieldError("quantity") ?? ""}
              />
            ) : (
              <FieldError id="portfolio-quantity-error" />
            )}
          </div>
          <div className="profile-field">
            <RequiredLabel
              htmlFor="portfolio-average-price"
              label={t.averagePurchasePrice}
            />
            <Input
              aria-describedby={
                getFieldError("averagePurchasePrice")
                  ? "portfolio-average-price-error"
                  : undefined
              }
              aria-invalid={showFieldError("averagePurchasePrice")}
              className={
                showFieldError("averagePurchasePrice") ? "ui-control-invalid" : ""
              }
              disabled={isPending}
              id="portfolio-average-price"
              inputMode="decimal"
              onBlur={(event) => {
                markTouched("averagePurchasePrice");
                normalizeNumericField(event, setAveragePurchasePrice);
              }}
              onChange={(event) => {
                if (canAcceptPurchaseNumberInput(event.target.value)) {
                  setAveragePurchasePrice(event.target.value);
                  setFormError(null);
                }
              }}
              required
              type="text"
              value={averagePurchasePrice}
            />
            {getFieldError("averagePurchasePrice") ? (
              <FieldError
                id="portfolio-average-price-error"
                message={getFieldError("averagePurchasePrice") ?? ""}
              />
            ) : quoteMutation.isPending || prefilledQuoteQuery.isLoading ? (
              <FieldError
                className="portfolio-field-status"
                id="portfolio-average-price-error"
                message={t.loadingCurrentPrice}
                role="status"
              />
            ) : quoteMutation.error instanceof Error ||
              prefilledQuoteQuery.error instanceof Error ? (
              <FieldError
                className="portfolio-field-status error-text"
                id="portfolio-average-price-error"
                message={t.currentPricePresetError}
              />
            ) : (
              <FieldError id="portfolio-average-price-error" />
            )}
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="portfolio-currency" label={t.currency} />
            <Select
              aria-describedby={
                getFieldError("currency") ? "portfolio-currency-error" : undefined
              }
              aria-invalid={showFieldError("currency")}
              className={showFieldError("currency") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="portfolio-currency"
              onBlur={() => markTouched("currency")}
              onChange={(event) => {
                if (isSupportedPurchaseCurrency(event.target.value)) {
                  setCurrency(event.target.value);
                }
                setFormError(null);
              }}
              required
              value={currency}
            >
              {purchaseCurrencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {getFieldError("currency") ? (
              <FieldError
                id="portfolio-currency-error"
                message={getFieldError("currency") ?? ""}
              />
            ) : (
              <FieldError id="portfolio-currency-error" />
            )}
          </div>
          <div className="profile-field">
            <RequiredLabel htmlFor="portfolio-purchase-date" label={t.purchaseDate} />
            <Input
              aria-describedby={
                getFieldError("purchaseDate")
                  ? "portfolio-purchase-date-error"
                  : undefined
              }
              aria-invalid={showFieldError("purchaseDate")}
              className={showFieldError("purchaseDate") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="portfolio-purchase-date"
              max={latestPurchaseDate}
              onBlur={() => markTouched("purchaseDate")}
              onChange={(event) => {
                setPurchaseDate(event.target.value);
                setFormError(null);
              }}
              required
              step="60"
              type="datetime-local"
              value={purchaseDate}
            />
            {getFieldError("purchaseDate") ? (
              <FieldError
                id="portfolio-purchase-date-error"
                message={getFieldError("purchaseDate") ?? ""}
              />
            ) : (
              <FieldError id="portfolio-purchase-date-error" />
            )}
          </div>
          <div className="profile-field profile-field-full">
            <Label htmlFor="portfolio-notes">{t.notes}</Label>
            <Textarea
              aria-describedby={
                getFieldError("notes")
                  ? "portfolio-notes-error portfolio-notes-help"
                  : "portfolio-notes-help"
              }
              aria-invalid={showFieldError("notes")}
              className={showFieldError("notes") ? "ui-control-invalid" : ""}
              disabled={isPending}
              id="portfolio-notes"
              maxLength={purchaseNotesMaxLength}
              onBlur={() => markTouched("notes")}
              onChange={(event) => {
                setNotes(event.target.value);
                setFormError(null);
              }}
              rows={4}
              value={notes}
            />
            <small className="portfolio-field-status" id="portfolio-notes-help">
              {t.notesMaxLengthHelp.replace(
                "{count}",
                String(purchaseNotesMaxLength - notes.length),
              )}
            </small>
            {getFieldError("notes") ? (
              <FieldError
                id="portfolio-notes-error"
                message={getFieldError("notes") ?? ""}
              />
            ) : null}
          </div>
          <div className="portfolio-modal-actions profile-field-full">
            <Button disabled={isPending} onClick={onClose} type="button" variant="outline">
              {t.cancel}
            </Button>
            <Button disabled={!isFormValid || isPending} type="submit">
              {isPending ? t.saving : t.savePosition}
            </Button>
          </div>
        </form>
        {formError ? (
          <p className="error-text" id={formErrorId} role="alert">
            {formError}
          </p>
        ) : null}
        {submissionError ? (
          <p className="error-text" id={serverErrorId} role="alert">
            {t.positionSaveError} {submissionError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function PositionSearchResults({
  results,
  t,
  onSelect,
}: {
  results: StockSearchResult[];
  t: Dictionary;
  onSelect: (stock: StockSearchResult) => void;
}) {
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

function RequiredLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <Label htmlFor={htmlFor}>
      {label} <span aria-hidden="true" className="required-indicator">*</span>
      <span className="visually-hidden"> required</span>
    </Label>
  );
}

function FieldError({
  className = "",
  id,
  message,
  role = "alert",
}: {
  className?: string;
  id: string;
  message?: string;
  role?: "alert" | "status";
}) {
  return (
    <small
      aria-hidden={message ? undefined : true}
      className={`field-error ${className}`.trim()}
      id={id}
      role={message ? role : undefined}
    >
      {message}
    </small>
  );
}

function getSearchControlStatus({
  error,
  isLoading,
  results,
  t,
}: {
  error: Error | null;
  isLoading: boolean;
  results: StockSearchResult[] | undefined;
  t: Dictionary;
}): string | null {
  if (isLoading) {
    return null;
  }

  if (error) {
    return t.stockSearchUnavailable;
  }

  if (results && results.length === 0) {
    return t.noMatchingStocks;
  }

  return null;
}

function canAcceptPurchaseNumberInput(value: string): boolean {
  if (value === "") {
    return true;
  }

  if (!/^(?:0|[1-9]\d*)(?:[\.,]\d*)?$/.test(value)) {
    return false;
  }

  const normalizedValue = Number(normalizePurchaseNumberInput(value));
  return !Number.isFinite(normalizedValue) || normalizedValue <= purchaseNumberMax;
}

function getValidationMessages(t: Dictionary): AddPurchaseValidationMessages {
  return {
    currencyRequiredError: t.currencyRequiredError,
    currencyUnsupportedError: t.currencyUnsupportedError,
    futurePurchaseDateError: t.futurePurchaseDateError,
    notesDangerousError: t.notesDangerousError,
    notesMaxLengthError: t.notesMaxLengthError,
    priceInvalidNumberError: t.priceInvalidNumberError,
    priceRangeError: t.priceRangeError,
    priceRequiredError: t.priceRequiredError,
    purchaseDateRequiredError: t.purchaseDateRequiredError,
    quantityInvalidNumberError: t.quantityInvalidNumberError,
    quantityRangeError: t.quantityRangeError,
    quantityRequiredError: t.quantityRequiredError,
    stockSelectionRequiredError: t.stockSelectionRequiredError,
  };
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

function useModalEffects(
  onClose: () => void,
  firstFieldRef: RefObject<HTMLInputElement | null>,
): void {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    firstFieldRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [firstFieldRef, onClose]);
}

function getCurrentLocalDateTime(): string {
  return formatDateTimeLocalValue(new Date());
}

function formatDateTimeLocalValue(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}
