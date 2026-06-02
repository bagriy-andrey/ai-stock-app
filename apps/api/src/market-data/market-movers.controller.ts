import { Controller, Get, UseGuards } from "@nestjs/common";
import type { MarketMoversResponse } from "@ai-stock-advisor/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MarketDataService } from "./market-data.service";

@Controller("market/movers")
@UseGuards(JwtAuthGuard)
export class MarketMoversController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  getMarketMovers(): Promise<MarketMoversResponse> {
    return this.marketDataService.getMarketMovers();
  }
}
