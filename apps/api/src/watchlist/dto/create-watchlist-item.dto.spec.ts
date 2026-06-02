import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateWatchlistItemDto } from "./create-watchlist-item.dto";

describe("CreateWatchlistItemDto", () => {
  it("trims and uppercases tickers", async () => {
    const dto = plainToInstance(CreateWatchlistItemDto, {
      ticker: " aapl ",
      companyName: " Apple Inc. ",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.ticker).toBe("AAPL");
    expect(dto.companyName).toBe("Apple Inc.");
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
});
