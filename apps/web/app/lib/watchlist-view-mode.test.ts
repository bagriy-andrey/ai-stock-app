import { normalizeWatchlistViewMode } from "./watchlist-view-mode";

describe("normalizeWatchlistViewMode", () => {
  it("keeps supported watchlist view modes", () => {
    expect(normalizeWatchlistViewMode("grid")).toBe("grid");
    expect(normalizeWatchlistViewMode("list")).toBe("list");
  });

  it("defaults unsupported or missing values to grid", () => {
    expect(normalizeWatchlistViewMode(undefined)).toBe("grid");
    expect(normalizeWatchlistViewMode("cards")).toBe("grid");
  });
});
