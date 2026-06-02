import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FinnhubMarketDataProvider } from "./finnhub-market-data.provider";
import { InMemoryCacheService } from "./in-memory-cache.service";
import { HISTORICAL_MARKET_DATA_PROVIDER } from "./historical-market-data-provider";
import { MarketDataController } from "./market-data.controller";
import { MARKET_DATA_PROVIDER } from "./market-data-provider";
import { MarketStocksController } from "./market-stocks.controller";
import { MarketDataService } from "./market-data.service";
import { YahooFinanceProvider } from "./yahoo-finance.provider";

@Module({
  imports: [AuthModule],
  controllers: [MarketDataController, MarketStocksController],
  providers: [
    InMemoryCacheService,
    FinnhubMarketDataProvider,
    {
      provide: YahooFinanceProvider,
      useFactory: () => new YahooFinanceProvider(),
    },
    {
      provide: MARKET_DATA_PROVIDER,
      useExisting: FinnhubMarketDataProvider,
    },
    {
      provide: HISTORICAL_MARKET_DATA_PROVIDER,
      useExisting: YahooFinanceProvider,
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
