import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { StocksModule } from "./stocks/stocks.module";

@Module({
  imports: [StocksModule],
  controllers: [HealthController],
})
export class AppModule {}

