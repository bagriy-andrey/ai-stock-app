import { Injectable, UnauthorizedException } from "@nestjs/common";
import { getRequiredAuthEnv } from "../config/env";

const facebookGraphBaseUrl = "https://graph.facebook.com";
const facebookGraphVersion = "v20.0";

interface FacebookDebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
    expires_at?: number;
    error?: {
      message?: string;
    };
  };
}

interface FacebookProfileResponse {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  error?: {
    message?: string;
  };
}

export interface FacebookAuthProfile {
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

@Injectable()
export class FacebookAuthService {
  async verifyAccessToken(accessToken: string): Promise<FacebookAuthProfile> {
    const debugData = await this.debugAccessToken(accessToken);
    const appId = getRequiredAuthEnv("FACEBOOK_APP_ID");

    if (
      debugData.app_id !== appId ||
      debugData.is_valid !== true ||
      !debugData.user_id
    ) {
      throw new UnauthorizedException("Invalid Facebook access token");
    }

    if (isExpiredFacebookToken(debugData.expires_at)) {
      throw new UnauthorizedException("Invalid Facebook access token");
    }

    const profile = await this.fetchProfile(accessToken);

    if (!profile.id || profile.id !== debugData.user_id) {
      throw new UnauthorizedException("Invalid Facebook access token");
    }

    return {
      providerId: profile.id,
      email: normalizeOptionalString(profile.email)?.toLowerCase(),
      firstName: normalizeOptionalString(profile.first_name),
      lastName: normalizeOptionalString(profile.last_name),
      avatarUrl: normalizeOptionalString(profile.picture?.data?.url),
      emailVerified: false,
    };
  }

  private async debugAccessToken(
    accessToken: string,
  ): Promise<NonNullable<FacebookDebugTokenResponse["data"]>> {
    const appId = getRequiredAuthEnv("FACEBOOK_APP_ID");
    const appSecret = getRequiredAuthEnv("FACEBOOK_APP_SECRET");
    const url = new URL(`${facebookGraphBaseUrl}/${facebookGraphVersion}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", `${appId}|${appSecret}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new UnauthorizedException("Invalid Facebook access token");
      }

      const body = (await response.json()) as FacebookDebugTokenResponse;

      if (!body.data || body.data.error) {
        throw new UnauthorizedException("Invalid Facebook access token");
      }

      return body.data;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid Facebook access token");
    }
  }

  private async fetchProfile(accessToken: string): Promise<FacebookProfileResponse> {
    const url = new URL(`${facebookGraphBaseUrl}/${facebookGraphVersion}/me`);
    url.searchParams.set("fields", "id,email,first_name,last_name,picture");
    url.searchParams.set("access_token", accessToken);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new UnauthorizedException("Invalid Facebook access token");
      }

      const body = (await response.json()) as FacebookProfileResponse;

      if (body.error) {
        throw new UnauthorizedException("Invalid Facebook access token");
      }

      return body;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid Facebook access token");
    }
  }
}

function isExpiredFacebookToken(expiresAt: number | undefined): boolean {
  return typeof expiresAt === "number" && expiresAt > 0 && expiresAt * 1000 <= Date.now();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
