import {
  buildTransactionsSearchParams,
} from "./transactions-api";
import {
  buildTransactionsQueryKey,
  buildTransactionsQueryState,
  getPageAfterTransactionsFilterChange,
  hasTransactionFilters,
  transactionMatchesFilters,
  toTransactionFilters,
} from "./transactions-query-state";

describe("transactions query state", () => {
  it("filtering transactions resets page to 1", () => {
    expect(getPageAfterTransactionsFilterChange()).toBe(1);
  });

  it("clearing filters resets page to 1", () => {
    expect(getPageAfterTransactionsFilterChange()).toBe(1);
  });

  it("includes page, limit, and ticker filter in the query key and params", () => {
    const state = buildTransactionsQueryState({
      page: 2,
      limit: 10,
      ticker: " aapl ",
      type: "",
      fromDate: "",
      toDate: "",
    });

    expect(buildTransactionsQueryKey(state)).toEqual([
      "transactions",
      {
        page: 2,
        limit: 10,
        ticker: "AAPL",
        type: "",
        fromDate: "",
        toDate: "",
      },
    ]);
    expect(buildTransactionsSearchParams(toTransactionFilters(state)).toString())
      .toBe("ticker=AAPL&page=2&limit=10");
  });

  it("includes page, limit, and date range filters in the query key and params", () => {
    const state = buildTransactionsQueryState({
      page: 3,
      limit: 10,
      ticker: "",
      type: "",
      fromDate: "2026-05-01",
      toDate: "2026-05-31",
    });

    expect(buildTransactionsQueryKey(state)).toEqual([
      "transactions",
      {
        page: 3,
        limit: 10,
        ticker: "",
        type: "",
        fromDate: "2026-05-01",
        toDate: "2026-05-31",
      },
    ]);
    expect(buildTransactionsSearchParams(toTransactionFilters(state)).toString())
      .toBe("fromDate=2026-05-01&toDate=2026-05-31&page=3&limit=10");
  });

  it("omits empty filters from API params while retaining them in the query key", () => {
    const state = buildTransactionsQueryState({
      page: 1,
      limit: 10,
      ticker: " ",
      type: "",
      fromDate: "",
      toDate: "",
    });

    expect(hasTransactionFilters(state)).toBe(false);
    expect(buildTransactionsQueryKey(state)).toEqual([
      "transactions",
      {
        page: 1,
        limit: 10,
        ticker: "",
        type: "",
        fromDate: "",
        toDate: "",
      },
    ]);
    expect(buildTransactionsSearchParams(toTransactionFilters(state)).toString())
      .toBe("page=1&limit=10");
  });

  it("includes transaction type filters in the query key and params", () => {
    const state = buildTransactionsQueryState({
      page: 1,
      limit: 10,
      ticker: "aapl",
      type: "BUY",
      fromDate: "",
      toDate: "",
    });

    expect(hasTransactionFilters(state)).toBe(true);
    expect(buildTransactionsQueryKey(state)).toEqual([
      "transactions",
      {
        page: 1,
        limit: 10,
        ticker: "AAPL",
        type: "BUY",
        fromDate: "",
        toDate: "",
      },
    ]);
    expect(buildTransactionsSearchParams(toTransactionFilters(state)).toString())
      .toBe("ticker=AAPL&type=BUY&page=1&limit=10");
  });

  it("detects when an updated transaction no longer matches ticker filters", () => {
    const state = buildTransactionsQueryState({
      page: 3,
      limit: 10,
      ticker: "AAPL",
      type: "",
      fromDate: "",
      toDate: "",
    });

    expect(
      transactionMatchesFilters(
        {
          id: "tx-1",
          userId: "user-1",
          ticker: "MSFT",
          companyName: "Microsoft Corporation",
          type: "BUY",
          quantity: 1,
          price: 200,
          currency: "USD",
          transactionDate: "2026-05-15T12:00:00.000Z",
          createdAt: "2026-05-15T12:00:00.000Z",
          updatedAt: "2026-05-15T12:00:00.000Z",
        },
        state,
      ),
    ).toBe(false);
  });

  it("detects when an updated transaction no longer matches type filters", () => {
    const state = buildTransactionsQueryState({
      page: 1,
      limit: 10,
      ticker: "",
      type: "SELL",
      fromDate: "",
      toDate: "",
    });

    expect(
      transactionMatchesFilters(
        {
          id: "tx-1",
          userId: "user-1",
          ticker: "AAPL",
          companyName: "Apple Inc.",
          type: "BUY",
          quantity: 1,
          price: 150,
          currency: "USD",
          transactionDate: "2026-05-15T12:00:00.000Z",
          createdAt: "2026-05-15T12:00:00.000Z",
          updatedAt: "2026-05-15T12:00:00.000Z",
        },
        state,
      ),
    ).toBe(false);
  });

  it("detects when an updated transaction no longer matches date filters", () => {
    const state = buildTransactionsQueryState({
      page: 2,
      limit: 10,
      ticker: "",
      type: "",
      fromDate: "2026-05-01",
      toDate: "2026-05-31",
    });

    expect(
      transactionMatchesFilters(
        {
          id: "tx-1",
          userId: "user-1",
          ticker: "AAPL",
          companyName: "Apple Inc.",
          type: "BUY",
          quantity: 1,
          price: 150,
          currency: "USD",
          transactionDate: "2026-06-01T00:00:00.000Z",
          createdAt: "2026-05-15T12:00:00.000Z",
          updatedAt: "2026-05-15T12:00:00.000Z",
        },
        state,
      ),
    ).toBe(false);
  });
});
