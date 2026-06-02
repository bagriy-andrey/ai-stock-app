import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthResponse, UserDto } from "@ai-stock-advisor/shared";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { getRequiredEnv } from "../config/env";
import { UsersService } from "../users/users.service";
import type { JwtPayload } from "./jwt-payload";

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client(getRequiredEnv("GOOGLE_CLIENT_ID"));

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const payload = await this.verifyGoogleCredential(credential);
    const email = payload.email;

    if (!email || !payload.email_verified) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const user = await this.usersService.findOrCreateFromGoogle({
      email,
      name: payload.name ?? email,
      avatarUrl: payload.picture,
    });

    return {
      accessToken: await this.signUser(user),
      user,
    };
  }

  async getCurrentUser(userId: string): Promise<UserDto> {
    return this.usersService.findById(userId);
  }

  private async verifyGoogleCredential(credential: string): Promise<TokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: getRequiredEnv("GOOGLE_CLIENT_ID"),
      });
      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException("Invalid Google credential");
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid Google credential");
    }
  }

  private signUser(user: UserDto): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload);
  }
}
