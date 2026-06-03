import { buildPortfolioSearchParams } from "./portfolio-api";
import {
  buildPortfolioQueryKey,
  buildPortfolioQueryState,
  getPageAfterPortfolioFilterChange,
} from "./portfolio-query-state";

describe("portfolio query state", () => {
  it("includes pagination params in the query key and API params", () => {
    const state = buildPortfolioQueryState({ page: 2, limit: 10 });

    expect(buildPortfolioQueryKey(state)).toEqual([
      "portfolio",
      { page: 2, limit: 10 },
    ]);
    expect(buildPortfolioSearchParams(state).toString()).toBe("page=2&limit=10");
  });

  it("resets page to 1 when portfolio filters change", () => {
    expect(getPageAfterPortfolioFilterChange()).toBe(1);
  });
});
