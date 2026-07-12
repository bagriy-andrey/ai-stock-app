import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import type { WatchlistItemDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { getAuthenticatedUserId } from "../auth/get-authenticated-user-id";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListLimitQueryDto } from "../common/dto/list-limit-query.dto";
import { CreateWatchlistItemDto } from "./dto/create-watchlist-item.dto";
import { WatchlistService } from "./watchlist.service";

@Controller("watchlist")
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlist(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListLimitQueryDto,
  ): Promise<WatchlistItemDto[]> {
    return this.watchlistService.findAllForUser(
      getAuthenticatedUserId(request),
      query.limit,
    );
  }

  @Post()
  addWatchlistItem(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateWatchlistItemDto,
  ): Promise<WatchlistItemDto> {
    return this.watchlistService.addForUser(
      getAuthenticatedUserId(request),
      body,
    );
  }

  @Delete(":id")
  @HttpCode(204)
  removeWatchlistItem(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.watchlistService.removeForUser(
      getAuthenticatedUserId(request),
      id,
    );
  }
}
