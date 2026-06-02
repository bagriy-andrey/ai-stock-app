import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FinnhubMarketDataProvider } from "./finnhub-market-data.provider";
import { InMemoryCacheService } from "./in-memory-cache.service";
import { MarketDataController } from "./market-data.controller";
import { MARKET_DATA_PROVIDER } from "./market-data-provider";
import { MarketDataService } from "./market-data.service";

@Module({
  imports: [AuthModule],
  controllers: [MarketDataController],
  providers: [
    InMemoryCacheService,
    FinnhubMarketDataProvider,
    {
      provide: MARKET_DATA_PROVIDER,
      useExisting: FinnhubMarketDataProvider,
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
