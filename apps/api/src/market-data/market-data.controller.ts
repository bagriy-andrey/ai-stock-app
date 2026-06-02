import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type {
  CompanyProfile,
  StockQuote,
  StockSearchResult,
} from "@ai-stock-advisor/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetQuotesDto } from "./dto/get-quotes.dto";
import { SearchSymbolsQueryDto } from "./dto/search-symbols-query.dto";
import { TickerParamDto } from "./dto/ticker-param.dto";
import { MarketDataService } from "./market-data.service";

@Controller("market-data")
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get("search")
  searchSymbols(@Query() query: SearchSymbolsQueryDto): Promise<StockSearchResult[]> {
    return this.marketDataService.searchSymbols(query.query);
  }

  @Get("quote/:ticker")
  getQuote(@Param() params: TickerParamDto): Promise<StockQuote> {
    return this.marketDataService.getQuote(params.ticker);
  }

  @Post("quotes")
  getQuotes(@Body() body: GetQuotesDto): Promise<StockQuote[]> {
    return this.marketDataService.getQuotes(body.tickers);
  }

  @Get("company/:ticker")
  getCompanyProfile(@Param() params: TickerParamDto): Promise<CompanyProfile> {
    return this.marketDataService.getCompanyProfile(params.ticker);
  }
}
