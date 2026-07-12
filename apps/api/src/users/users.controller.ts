import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import type { UserDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { getAuthenticatedUserId } from "../auth/get-authenticated-user-id";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() request: AuthenticatedRequest): Promise<UserDto> {
    return this.usersService.findById(getAuthenticatedUserId(request));
  }
}
