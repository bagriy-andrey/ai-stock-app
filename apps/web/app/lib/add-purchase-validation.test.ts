import {
  defaultPurchaseCurrency,
  purchaseNumberMax,
  validateAddPurchaseForm,
} from "./add-purchase-validation";

const messages = {
  currencyRequiredError: "Currency is required.",
  currencyUnsupportedError: "Select a supported currency.",
  futurePurchaseDateError: "Purchase date cannot be in the future.",
  notesDangerousError: "Notes cannot contain HTML.",
  notesMaxLengthError: "Notes must be 500 characters or fewer.",
  priceInvalidNumberError: "Enter a valid purchase price.",
  priceRangeError: "Purchase price is out of range.",
  priceRequiredError: "Purchase price is required.",
  purchaseDateRequiredError: "Purchase date is required.",
  quantityInvalidNumberError: "Enter a valid quantity.",
  quantityRangeError: "Quantity is out of range.",
  quantityRequiredError: "Quantity is required.",
  stockSelectionRequiredError: "Please select a stock from the list.",
};

const validInput = {
  averagePurchasePrice: "150,25",
  companyName: "Apple Inc.",
  currency: defaultPurchaseCurrency,
  notes: "  Long-term position  ",
  purchaseDate: "2026-05-01T10:30",
  quantity: "1.5",
  selectedFromSearch: true,
  ticker: "AAPL",
};

describe("add purchase validation", () => {
  it("normalizes valid form input", () => {
    const result = validateAddPurchaseForm(validInput, messages);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toMatchObject({
        averagePurchasePrice: 150.25,
        companyName: "Apple Inc.",
        currency: "USD",
        notes: "Long-term position",
        quantity: 1.5,
        ticker: "AAPL",
      });
      expect(result.data.purchaseDate).toMatch(
        /^2026-05-01T\d{2}:30:00\.000Z$/,
      );
    }
  });

  it.each([
    ["quantity", "0"],
    ["quantity", "-1"],
    ["quantity", "00001"],
    ["quantity", "abc"],
    ["quantity", "1e10"],
    ["quantity", String(purchaseNumberMax + 1)],
    ["averagePurchasePrice", "0"],
    ["averagePurchasePrice", "abc"],
    ["averagePurchasePrice", "1e10"],
  ])("rejects invalid %s input %s", (field, value) => {
    const result = validateAddPurchaseForm(
      {
        ...validInput,
        [field]: value,
      },
      messages,
    );

    expect(result.success).toBe(false);
    expect(result.errors[field as "quantity" | "averagePurchasePrice"]).toBeDefined();
  });

  it("requires a selected stock and rejects future dates", () => {
    const result = validateAddPurchaseForm(
      {
        ...validInput,
        purchaseDate: "2999-01-01T10:00",
        selectedFromSearch: false,
      },
      messages,
    );

    expect(result.success).toBe(false);
    expect(result.errors.ticker).toBe(messages.stockSelectionRequiredError);
    expect(result.errors.purchaseDate).toBe(messages.futurePurchaseDateError);
  });

  it("rejects unsupported currencies and unsafe notes", () => {
    const result = validateAddPurchaseForm(
      {
        ...validInput,
        currency: "EUR",
        notes: "<script>alert(1)</script>",
      },
      messages,
    );

    expect(result.success).toBe(false);
    expect(result.errors.currency).toBe(messages.currencyUnsupportedError);
    expect(result.errors.notes).toBe(messages.notesDangerousError);
  });
});
