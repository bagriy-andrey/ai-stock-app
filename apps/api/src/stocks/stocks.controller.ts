import { Controller, Get, Param } from "@nestjs/common";
import type { MockStockQuote } from "@ai-stock-advisor/shared";
import { StockSymbolDto } from "./dto/stock-symbol.dto";
import { StocksService } from "./stocks.service";

@Controller("stocks")
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get("mock")
  getMockQuotes(): MockStockQuote[] {
    return this.stocksService.getMockQuotes();
  }

  @Get("mock/:symbol")
  getMockQuote(@Param() params: StockSymbolDto): MockStockQuote {
    return this.stocksService.getMockQuote(params.symbol);
  }
}
