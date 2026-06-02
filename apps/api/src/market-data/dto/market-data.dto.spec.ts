import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { GetQuotesDto } from "./get-quotes.dto";
import { SearchSymbolsQueryDto } from "./search-symbols-query.dto";
import { TickerParamDto } from "./ticker-param.dto";

describe("market data DTOs", () => {
  it("requires a non-empty search query", async () => {
    const dto = plainToInstance(SearchSymbolsQueryDto, { query: "   " });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("trims and uppercases ticker parameters", async () => {
    const dto = plainToInstance(TickerParamDto, { ticker: " aapl " });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.ticker).toBe("AAPL");
  });

  it("normalizes quote ticker arrays", async () => {
    const dto = plainToInstance(GetQuotesDto, {
      tickers: [" aapl ", "msft"],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.tickers).toEqual(["AAPL", "MSFT"]);
  });

  it("rejects empty quote ticker arrays", async () => {
    const dto = plainToInstance(GetQuotesDto, { tickers: [] });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
