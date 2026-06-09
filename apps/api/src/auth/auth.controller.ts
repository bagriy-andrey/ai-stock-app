import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import type { AuthResponse, AuthUser } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthService } from "./auth.service";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("google")
  loginWithGoogle(@Body() body: GoogleLoginDto): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(body.credential);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@Request() request: AuthenticatedRequest): Promise<AuthUser> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.authService.getCurrentUser(request.user.sub);
  }
}
