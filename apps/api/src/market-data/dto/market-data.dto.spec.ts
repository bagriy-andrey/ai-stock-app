import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { GetQuotesDto } from "./get-quotes.dto";
import { GetCandlesQueryDto } from "./get-candles-query.dto";
import { SearchSymbolsQueryDto } from "./search-symbols-query.dto";
import { StockSymbolParamDto } from "./stock-symbol-param.dto";
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

  it("trims and uppercases stock symbol parameters", async () => {
    const dto = plainToInstance(StockSymbolParamDto, { symbol: " aapl " });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.symbol).toBe("AAPL");
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

  it("accepts supported candle ranges", async () => {
    await Promise.all(
      ["1d", "1w", "1m", "3m", "6m", "1y", "5y", "all"].map(
        async (range) => {
          const dto = plainToInstance(GetCandlesQueryDto, { range });

          await expect(validate(dto)).resolves.toHaveLength(0);
        },
      ),
    );
  });

  it("rejects unsupported candle ranges", async () => {
    const dto = plainToInstance(GetCandlesQueryDto, { range: "2y" });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
