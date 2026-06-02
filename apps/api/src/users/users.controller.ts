import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import type { UserDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() request: AuthenticatedRequest): Promise<UserDto> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.usersService.findById(request.user.sub);
  }
}
