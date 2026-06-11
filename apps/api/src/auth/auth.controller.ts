import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import type {
  AuthResponse,
  AuthUser,
  ConnectedAccountsResponse,
  ForgotPasswordResponse,
  LinkedAuthProviderResponse,
  ResetPasswordResponse,
} from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthService } from "./auth.service";
import { AppleLoginDto } from "./dto/apple-login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { FacebookLoginDto } from "./dto/facebook-login.dto";
import { GoogleLinkDto } from "./dto/google-link.dto";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("google")
  loginWithGoogle(@Body() body: GoogleLoginDto): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(body.credential);
  }

  @Post("apple")
  loginWithApple(@Body() body: AppleLoginDto): Promise<AuthResponse> {
    return this.authService.loginWithApple(body);
  }

  @Post("facebook")
  loginWithFacebook(@Body() body: FacebookLoginDto): Promise<AuthResponse> {
    return this.authService.loginWithFacebook(body.accessToken);
  }

  @Post("register")
  registerWithEmail(@Body() body: RegisterDto): Promise<AuthResponse> {
    return this.authService.registerWithEmail(body);
  }

  @Post("login")
  loginWithEmail(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.authService.loginWithEmail(body);
  }

  @Post("forgot-password")
  forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get("connected-accounts")
  @UseGuards(JwtAuthGuard)
  getConnectedAccounts(
    @Request() request: AuthenticatedRequest,
  ): Promise<ConnectedAccountsResponse> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.authService.getConnectedAccounts(request.user.sub);
  }

  @Post("link/google")
  @UseGuards(JwtAuthGuard)
  linkGoogle(
    @Request() request: AuthenticatedRequest,
    @Body() body: GoogleLinkDto,
  ): Promise<LinkedAuthProviderResponse> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.authService.linkGoogle(request.user.sub, body.idToken);
  }

  @Post("link/apple")
  @UseGuards(JwtAuthGuard)
  linkApple(
    @Request() request: AuthenticatedRequest,
    @Body() body: AppleLoginDto,
  ): Promise<LinkedAuthProviderResponse> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.authService.linkApple(request.user.sub, body);
  }

  @Post("link/facebook")
  @UseGuards(JwtAuthGuard)
  linkFacebook(
    @Request() request: AuthenticatedRequest,
    @Body() body: FacebookLoginDto,
  ): Promise<LinkedAuthProviderResponse> {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return this.authService.linkFacebook(request.user.sub, body.accessToken);
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
