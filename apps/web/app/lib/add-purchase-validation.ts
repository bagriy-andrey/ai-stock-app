import { z } from "zod";
import type {
  CreatePortfolioPositionRequest,
  PortfolioTransactionType,
  UpdatePortfolioTransactionRequest,
} from "@ai-stock-advisor/shared";

export const purchaseNumberMin = 0.0001;
export const purchaseNumberMax = 100_000_000;
export const purchaseNotesMaxLength = 500;
export const supportedPurchaseCurrencies = ["USD"] as const;
export const defaultPurchaseCurrency = "USD";
export const editableTransactionTypes = ["BUY", "SELL"] as const satisfies readonly PortfolioTransactionType[];

export type PurchaseCurrency = (typeof supportedPurchaseCurrencies)[number];
export type EditableTransactionType = (typeof editableTransactionTypes)[number];

export interface AddPurchaseValidationMessages {
  currencyRequiredError: string;
  currencyUnsupportedError: string;
  notesDangerousError: string;
  notesMaxLengthError: string;
  priceInvalidNumberError: string;
  priceRangeError: string;
  priceRequiredError: string;
  purchaseDateRequiredError: string;
  quantityInvalidNumberError: string;
  quantityRangeError: string;
  quantityRequiredError: string;
  stockSelectionRequiredError: string;
  futurePurchaseDateError: string;
}

export interface AddPurchaseFormValues {
  averagePurchasePrice: string;
  companyName: string;
  currency: string;
  notes: string;
  purchaseDate: string;
  quantity: string;
  selectedFromSearch: boolean;
  ticker: string;
}

export type AddPurchaseField = keyof AddPurchaseFormValues;
export type AddPurchaseFieldErrors = Partial<Record<AddPurchaseField, string>>;

export interface ParsedAddPurchaseForm {
  averagePurchasePrice: number;
  companyName: string;
  currency: PurchaseCurrency;
  notes?: string;
  purchaseDate: string;
  quantity: number;
  ticker: string;
}

export interface EditTransactionValidationMessages {
  currencyRequiredError: string;
  currencyUnsupportedError: string;
  futureTransactionDateError: string;
  notesDangerousError: string;
  notesMaxLengthError: string;
  priceInvalidNumberError: string;
  priceRangeError: string;
  priceRequiredError: string;
  quantityInvalidNumberError: string;
  quantityRangeError: string;
  quantityRequiredError: string;
  stockSelectionRequiredError: string;
  transactionDateRequiredError: string;
  transactionTypeRequiredError: string;
}

export interface EditTransactionFormValues {
  companyName: string;
  currency: string;
  notes: string;
  price: string;
  quantity: string;
  ticker: string;
  transactionDate: string;
  type: string;
}

export type EditTransactionField = keyof EditTransactionFormValues;
export type EditTransactionFieldErrors = Partial<
  Record<EditTransactionField, string>
>;

export interface ParsedEditTransactionForm {
  companyName: string;
  currency: PurchaseCurrency;
  notes?: string;
  price: number;
  quantity: number;
  ticker: string;
  transactionDate: string;
  type: EditableTransactionType;
}

const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
const purchaseNumberPattern = /^(?:0(?:[\.,]\d+)?|[1-9]\d*(?:[\.,]\d+)?)$/;
const dangerousNotesPattern =
  /<|>|javascript:|vbscript:|data:text\/html|on[a-z]+\s*=|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/i;

export function createAddPurchaseSchema(messages: AddPurchaseValidationMessages) {
  return z.object({
    ticker: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => tickerPattern.test(value), {
        message: messages.stockSelectionRequiredError,
      }),
    companyName: z.string().trim().min(1, messages.stockSelectionRequiredError),
    selectedFromSearch: z.literal(true, {
      errorMap: () => ({ message: messages.stockSelectionRequiredError }),
    }),
    quantity: createPurchaseNumberSchema({
      invalidMessage: messages.quantityInvalidNumberError,
      rangeMessage: messages.quantityRangeError,
      requiredMessage: messages.quantityRequiredError,
    }),
    averagePurchasePrice: createPurchaseNumberSchema({
      invalidMessage: messages.priceInvalidNumberError,
      rangeMessage: messages.priceRangeError,
      requiredMessage: messages.priceRequiredError,
    }),
    currency: z
      .string()
      .trim()
      .min(1, messages.currencyRequiredError)
      .refine(isSupportedPurchaseCurrency, messages.currencyUnsupportedError),
    purchaseDate: z
      .string()
      .min(1, messages.purchaseDateRequiredError)
      .refine((value) => {
        const purchaseDate = new Date(value);
        return (
          !Number.isNaN(purchaseDate.getTime()) &&
          purchaseDate.getTime() <= Date.now()
        );
      }, messages.futurePurchaseDateError),
    notes: createNotesSchema({
      dangerousMessage: messages.notesDangerousError,
      maxLengthMessage: messages.notesMaxLengthError,
    }),
  });
}

export function createEditTransactionSchema(
  messages: EditTransactionValidationMessages,
) {
  return z.object({
    ticker: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => tickerPattern.test(value), {
        message: messages.stockSelectionRequiredError,
      }),
    companyName: z.string().trim().min(1, messages.stockSelectionRequiredError),
    type: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isEditableTransactionType, messages.transactionTypeRequiredError),
    quantity: createPurchaseNumberSchema({
      invalidMessage: messages.quantityInvalidNumberError,
      rangeMessage: messages.quantityRangeError,
      requiredMessage: messages.quantityRequiredError,
    }),
    price: createPurchaseNumberSchema({
      invalidMessage: messages.priceInvalidNumberError,
      rangeMessage: messages.priceRangeError,
      requiredMessage: messages.priceRequiredError,
    }),
    currency: z
      .string()
      .trim()
      .min(1, messages.currencyRequiredError)
      .refine(isSupportedPurchaseCurrency, messages.currencyUnsupportedError),
    transactionDate: z
      .string()
      .min(1, messages.transactionDateRequiredError)
      .refine((value) => {
        const transactionDate = new Date(value);
        return (
          !Number.isNaN(transactionDate.getTime()) &&
          transactionDate.getTime() <= Date.now()
        );
      }, messages.futureTransactionDateError),
    notes: createNotesSchema({
      dangerousMessage: messages.notesDangerousError,
      maxLengthMessage: messages.notesMaxLengthError,
    }),
  });
}

export function validateAddPurchaseForm(
  values: AddPurchaseFormValues,
  messages: AddPurchaseValidationMessages,
):
  | { data: ParsedAddPurchaseForm; errors: AddPurchaseFieldErrors; success: true }
  | { data: null; errors: AddPurchaseFieldErrors; success: false } {
  const result = createAddPurchaseSchema(messages).safeParse(values);

  if (result.success) {
    const data = result.data;
    return {
      data: {
        averagePurchasePrice: data.averagePurchasePrice,
        companyName: data.companyName,
        currency: data.currency as PurchaseCurrency,
        notes: data.notes || undefined,
        purchaseDate: new Date(data.purchaseDate).toISOString(),
        quantity: data.quantity,
        ticker: data.ticker,
      },
      errors: {},
      success: true,
    };
  }

  return {
    data: null,
    errors: result.error.issues.reduce<AddPurchaseFieldErrors>((errors, issue) => {
      const field = issue.path[0] as AddPurchaseField | undefined;

      if (field && !errors[field]) {
        errors[field] = issue.message;
      }

      if (field === "selectedFromSearch" && !errors.ticker) {
        errors.ticker = issue.message;
      }

      return errors;
    }, {}),
    success: false,
  };
}

export function validateEditTransactionForm(
  values: EditTransactionFormValues,
  messages: EditTransactionValidationMessages,
):
  | { data: ParsedEditTransactionForm; errors: EditTransactionFieldErrors; success: true }
  | { data: null; errors: EditTransactionFieldErrors; success: false } {
  const result = createEditTransactionSchema(messages).safeParse(values);

  if (result.success) {
    const data = result.data;
    return {
      data: {
        companyName: data.companyName,
        currency: data.currency as PurchaseCurrency,
        notes: data.notes || undefined,
        price: data.price,
        quantity: data.quantity,
        ticker: data.ticker,
        transactionDate: new Date(data.transactionDate).toISOString(),
        type: data.type as EditableTransactionType,
      },
      errors: {},
      success: true,
    };
  }

  return {
    data: null,
    errors: result.error.issues.reduce<EditTransactionFieldErrors>(
      (errors, issue) => {
        const field = issue.path[0] as EditTransactionField | undefined;

        if (field && !errors[field]) {
          errors[field] = issue.message;
        }

        return errors;
      },
      {},
    ),
    success: false,
  };
}

export function toCreatePortfolioPositionRequest(
  parsedForm: ParsedAddPurchaseForm,
): CreatePortfolioPositionRequest {
  return {
    ticker: parsedForm.ticker,
    companyName: parsedForm.companyName,
    quantity: parsedForm.quantity,
    averagePurchasePrice: parsedForm.averagePurchasePrice,
    currency: parsedForm.currency,
    purchaseDate: parsedForm.purchaseDate,
    notes: parsedForm.notes,
  };
}

export function toUpdatePortfolioTransactionRequest(
  parsedForm: ParsedEditTransactionForm,
): UpdatePortfolioTransactionRequest {
  return {
    type: parsedForm.type,
    quantity: parsedForm.quantity,
    price: parsedForm.price,
    currency: parsedForm.currency,
    transactionDate: parsedForm.transactionDate,
    notes: parsedForm.notes,
  };
}

export function normalizePurchaseNumberInput(value: string): string {
  return value.trim().replace(",", ".");
}

export function canAcceptPurchaseNumberInput(value: string): boolean {
  if (value === "") {
    return true;
  }

  if (!/^(?:0|[1-9]\d*)(?:[\.,]\d*)?$/.test(value)) {
    return false;
  }

  const normalizedValue = Number(normalizePurchaseNumberInput(value));
  return !Number.isFinite(normalizedValue) || normalizedValue <= purchaseNumberMax;
}

export function getInitialPurchaseCurrency(
  preferredCurrency: string | undefined,
): PurchaseCurrency {
  return isSupportedPurchaseCurrency(preferredCurrency)
    ? preferredCurrency
    : defaultPurchaseCurrency;
}

export function isSupportedPurchaseCurrency(
  value: unknown,
): value is PurchaseCurrency {
  return (
    typeof value === "string" &&
    supportedPurchaseCurrencies.includes(value as PurchaseCurrency)
  );
}

export function isEditableTransactionType(
  value: unknown,
): value is EditableTransactionType {
  return (
    typeof value === "string" &&
    editableTransactionTypes.includes(value as EditableTransactionType)
  );
}

function createPurchaseNumberSchema({
  invalidMessage,
  rangeMessage,
  requiredMessage,
}: {
  invalidMessage: string;
  rangeMessage: string;
  requiredMessage: string;
}) {
  return z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => purchaseNumberPattern.test(value), invalidMessage)
    .transform((value) => Number(normalizePurchaseNumberInput(value)))
    .refine(
      (value) =>
        Number.isFinite(value) &&
        value >= purchaseNumberMin &&
        value <= purchaseNumberMax,
      rangeMessage,
    );
}

function createNotesSchema({
  dangerousMessage,
  maxLengthMessage,
}: {
  dangerousMessage: string;
  maxLengthMessage: string;
}) {
  return z
    .string()
    .transform(normalizeNotesInput)
    .refine((value) => value.length <= purchaseNotesMaxLength, {
      message: maxLengthMessage,
    })
    .refine((value) => !dangerousNotesPattern.test(value), {
      message: dangerousMessage,
    });
}

function normalizeNotesInput(value: string): string {
  return value.trim().replace(/\r\n?/g, "\n");
}
