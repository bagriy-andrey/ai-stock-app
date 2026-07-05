import { getWatchlistTargetPriceSummary } from "./watchlist-target-price";

describe("getWatchlistTargetPriceSummary", () => {
  it("returns neutral state when target price is missing", () => {
    expect(
      getWatchlistTargetPriceSummary({
        currentPrice: 190,
        language: "en",
      }),
    ).toEqual({
      deltaLabel: null,
      targetLabel: null,
      variant: "neutral",
    });
  });

  it("formats upside target gap when current price is available", () => {
    expect(
      getWatchlistTargetPriceSummary({
        currentPrice: 200,
        currency: "USD",
        language: "en",
        targetPrice: 220,
      }),
    ).toEqual({
      deltaLabel: "+10.00%",
      targetLabel: "$220.00",
      variant: "positive",
    });
  });

  it("formats downside target gap when target is below market", () => {
    expect(
      getWatchlistTargetPriceSummary({
        currentPrice: 200,
        currency: "USD",
        language: "en",
        targetPrice: 180,
      }),
    ).toEqual({
      deltaLabel: "-10.00%",
      targetLabel: "$180.00",
      variant: "negative",
    });
  });
});
