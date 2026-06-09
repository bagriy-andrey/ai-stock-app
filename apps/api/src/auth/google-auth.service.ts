import { Injectable, UnauthorizedException } from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { getRequiredEnv } from "../config/env";

export interface GoogleAuthProfile {
  providerId?: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly googleClient = new OAuth2Client(getRequiredEnv("GOOGLE_CLIENT_ID"));

  async verifyCredential(credential: string): Promise<GoogleAuthProfile> {
    const payload = await this.verifyGoogleCredential(credential);

    return {
      providerId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name,
      firstName: payload.given_name,
      lastName: payload.family_name,
      avatarUrl: payload.picture,
    };
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
}
