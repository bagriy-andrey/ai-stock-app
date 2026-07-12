import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { MarketMoversResponse } from "@ai-stock-advisor/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListLimitQueryDto } from "../common/dto/list-limit-query.dto";
import { MarketDataService } from "./market-data.service";

@Controller("market/movers")
@UseGuards(JwtAuthGuard)
export class MarketMoversController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  getMarketMovers(
    @Query() query: ListLimitQueryDto,
  ): Promise<MarketMoversResponse> {
    return this.marketDataService.getMarketMovers(query.limit);
  }
}
