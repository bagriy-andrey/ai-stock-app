import "./config/load-env";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { StocksModule } from "./stocks/stocks.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? ""),
    UsersModule,
    AuthModule,
    StocksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
