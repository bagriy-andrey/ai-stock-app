import "./config/load-env";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { MarketDataModule } from "./market-data/market-data.module";
import { ProfileModule } from "./profile/profile.module";
import { StocksModule } from "./stocks/stocks.module";
import { UsersModule } from "./users/users.module";
import { WatchlistModule } from "./watchlist/watchlist.module";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? ""),
    UsersModule,
    AuthModule,
    StocksModule,
    WatchlistModule,
    MarketDataModule,
    ProfileModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
