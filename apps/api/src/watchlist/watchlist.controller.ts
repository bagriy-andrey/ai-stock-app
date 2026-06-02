import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import type { WatchlistItemDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateWatchlistItemDto } from "./dto/create-watchlist-item.dto";
import { WatchlistService } from "./watchlist.service";

@Controller("watchlist")
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlist(
    @Request() request: AuthenticatedRequest,
  ): Promise<WatchlistItemDto[]> {
    return this.watchlistService.findAllForUser(this.getAuthenticatedUserId(request));
  }

  @Post()
  addWatchlistItem(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreateWatchlistItemDto,
  ): Promise<WatchlistItemDto> {
    return this.watchlistService.addForUser(
      this.getAuthenticatedUserId(request),
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
      this.getAuthenticatedUserId(request),
      id,
    );
  }

  private getAuthenticatedUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return request.user.sub;
  }
}
