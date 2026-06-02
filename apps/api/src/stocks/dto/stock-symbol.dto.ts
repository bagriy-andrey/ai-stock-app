import { Matches } from "class-validator";

export class StockSymbolDto {
  @Matches(/^[A-Za-z][A-Za-z0-9.-]{0,9}$/, {
    message: "symbol must be a valid stock ticker",
  })
  symbol!: string;
}

