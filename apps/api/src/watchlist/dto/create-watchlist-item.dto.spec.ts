import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateWatchlistItemDto } from "./create-watchlist-item.dto";

describe("CreateWatchlistItemDto", () => {
  it("trims and uppercases tickers", async () => {
    const dto = plainToInstance(CreateWatchlistItemDto, {
      ticker: " aapl ",
      companyName: " Apple Inc. ",
      targetPrice: " 215.489 ",
      notes: " Buy on next pullback. ",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.ticker).toBe("AAPL");
    expect(dto.companyName).toBe("Apple Inc.");
    expect(dto.targetPrice).toBeCloseTo(215.489);
    expect(dto.notes).toBe("Buy on next pullback.");
  });

  it("rejects missing tickers", async () => {
    const dto = plainToInstance(CreateWatchlistItemDto, {
      ticker: "   ",
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("rejects invalid tickers", async () => {
    const dto = plainToInstance(CreateWatchlistItemDto, {
      ticker: "$AAPL",
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("rejects invalid target price and too-long notes", async () => {
    const dto = plainToInstance(CreateWatchlistItemDto, {
      ticker: "AAPL",
      targetPrice: "-1",
      notes: "x".repeat(281),
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
