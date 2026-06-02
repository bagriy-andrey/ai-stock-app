import { Controller, Get, Param } from "@nestjs/common";
import type { StockQuote } from "@ai-stock-advisor/shared";
import { StockSymbolDto } from "./dto/stock-symbol.dto";
import { StocksService } from "./stocks.service";

@Controller("stocks")
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get("mock")
  getMockQuotes(): StockQuote[] {
    return this.stocksService.getMockQuotes();
  }

  @Get("mock/:symbol")
  getMockQuote(@Param() params: StockSymbolDto): StockQuote {
    return this.stocksService.getMockQuote(params.symbol);
  }
}

