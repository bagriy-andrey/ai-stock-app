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
  PortfolioPositionDto,
} from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreatePortfolioPositionDto } from "./dto/create-portfolio-position.dto";
import { ListPortfolioQueryDto } from "./dto/list-portfolio-query.dto";
import { UpdatePortfolioPositionDto } from "./dto/update-portfolio-position.dto";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get("allocation")
  getAllocation(
    @Request() request: AuthenticatedRequest,
  ): Promise<PortfolioAllocationDto> {
    return this.portfolioService.getAllocationForUser(
      this.getAuthenticatedUserId(request),
    );
  }

  @Get()
  getPortfolio(
    @Request() request: AuthenticatedRequest,
    @Query() query: ListPortfolioQueryDto,
  ): Promise<PortfolioDto> {
    return this.portfolioService.findAllForUser(
      this.getAuthenticatedUserId(request),
      query,
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
