import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { MarketDataModule } from "../market-data/market-data.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioPerformanceService } from "./portfolio-performance.service";
import { PortfolioSnapshotScheduler } from "./portfolio-snapshot.scheduler";
import { PortfolioService } from "./portfolio.service";
import {
  PortfolioPosition,
  PortfolioPositionSchema,
} from "./schemas/portfolio-position.schema";
import {
  PortfolioSnapshot,
  PortfolioSnapshotSchema,
} from "./schemas/portfolio-snapshot.schema";

@Module({
  imports: [
    AuthModule,
    MarketDataModule,
    TransactionsModule,
    MongooseModule.forFeature([
      { name: PortfolioPosition.name, schema: PortfolioPositionSchema },
      { name: PortfolioSnapshot.name, schema: PortfolioSnapshotSchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioPerformanceService,
    PortfolioService,
    PortfolioSnapshotScheduler,
  ],
})
export class PortfolioModule {}
