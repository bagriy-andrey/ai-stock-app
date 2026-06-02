import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import {
  WatchlistItem,
  WatchlistItemSchema,
} from "./schemas/watchlist-item.schema";
import { WatchlistController } from "./watchlist.controller";
import { WatchlistService } from "./watchlist.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: WatchlistItem.name, schema: WatchlistItemSchema },
    ]),
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}
