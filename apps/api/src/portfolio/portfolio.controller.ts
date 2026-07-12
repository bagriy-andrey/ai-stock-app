import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import type {
  PortfolioAllocationDto,
  PortfolioDto,
  PortfolioPerformancePointDto,
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { getAuthenticatedUserId } from "../auth/get-authenticated-user-id";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePortfolioPositionDto } from "./dto/create-portfolio-position.dto";
import { ListPortfolioPerformanceQueryDto } from "./dto/list-portfolio-performance-query.dto";
import { ListPortfolioQueryDto } from "./dto/list-portfolio-query.dto";
import { UpdatePortfolioPositionDto } from "./dto/update-portfolio-position.dto";
import { PortfolioPerformanceService } from "./portfolio-performance.service";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly portfolioPerformanceService: PortfolioPerformanceService,
  ) {}

  @Get("allocation")
  getAllocation(
    @Request() request: AuthenticatedRequest,
  ): Promise<PortfolioAllocationDto> {
    return this.portfolioService.getAllocationForUser(
      getAuthenticatedUserId(request),
    );
  }

  @Get("performance")
  getPerformance(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListPortfolioPerformanceQueryDto,
  ): Promise<PortfolioPerformancePointDto[]> {
    return this.portfolioPerformanceService.getPerformanceForUser(
      getAuthenticatedUserId(request),
      query.range,
    );
  }

  @Get()
  getPortfolio(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListPortfolioQueryDto,
  ): Promise<PortfolioDto> {
    return this.portfolioService.findAllForUser(
      getAuthenticatedUserId(request),
      query,
    );
  }

  @Post()
  createPosition(
    @Request() request: AuthenticatedRequest,
    @Body() body: CreatePortfolioPositionDto,
  ): Promise<PortfolioPositionDto> {
    return this.portfolioService.createForUser(
      getAuthenticatedUserId(request),
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
      getAuthenticatedUserId(request),
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
      getAuthenticatedUserId(request),
      id,
    );
  }
}
