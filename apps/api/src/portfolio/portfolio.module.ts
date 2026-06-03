import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { MarketDataModule } from "../market-data/market-data.module";
import { PortfolioController } from "./portfolio.controller";
import { PortfolioService } from "./portfolio.service";
import {
  PortfolioPosition,
  PortfolioPositionSchema,
} from "./schemas/portfolio-position.schema";

@Module({
  imports: [
    AuthModule,
    MarketDataModule,
    MongooseModule.forFeature([
      { name: PortfolioPosition.name, schema: PortfolioPositionSchema },
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
