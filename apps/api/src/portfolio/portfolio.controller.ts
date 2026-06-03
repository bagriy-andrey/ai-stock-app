import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import type {
  PortfolioDto,
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePortfolioPositionDto } from "./dto/create-portfolio-position.dto";
import { UpdatePortfolioPositionDto } from "./dto/update-portfolio-position.dto";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  getPortfolio(@Request() request: AuthenticatedRequest): Promise<PortfolioDto> {
    return this.portfolioService.findAllForUser(
      this.getAuthenticatedUserId(request),
    );
  }

  @Post()
  createPosition(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreatePortfolioPositionDto,
  ): Promise<PortfolioPositionDto> {
    return this.portfolioService.createForUser(
      this.getAuthenticatedUserId(request),
      body,
    );
  }

  @Patch(":id")
  updatePosition(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: UpdatePortfolioPositionDto,
  ): Promise<PortfolioPositionDto> {
    return this.portfolioService.updateForUser(
      this.getAuthenticatedUserId(request),
      id,
      body,
    );
  }

  @Delete(":id")
  @HttpCode(204)
  removePosition(
    @Request() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<void> {
    return this.portfolioService.removeForUser(
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
