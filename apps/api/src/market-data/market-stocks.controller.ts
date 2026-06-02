import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { StockCandlesResponse, StockDetails } from "@ai-stock-advisor/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetCandlesQueryDto } from "./dto/get-candles-query.dto";
import { StockSymbolParamDto } from "./dto/stock-symbol-param.dto";
import { MarketDataService } from "./market-data.service";

@Controller("market/stocks")
@UseGuards(JwtAuthGuard)
export class MarketStocksController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get(":symbol/details")
  getStockDetails(@Param() params: StockSymbolParamDto): Promise<StockDetails> {
    return this.marketDataService.getStockDetails(params.symbol);
  }

  @Get(":symbol/candles")
  getCandles(
    @Param() params: StockSymbolParamDto,
    @Query() query: GetCandlesQueryDto,
  ): Promise<StockCandlesResponse> {
    return this.marketDataService.getCandles(params.symbol, query.range);
  }
}
