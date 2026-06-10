import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  createPublicKey,
  type JsonWebKey as CryptoJsonWebKey,
  type KeyObject,
} from "node:crypto";
import jwt, { type JwtHeader, type JwtPayload } from "jsonwebtoken";
import { getRequiredAuthEnv } from "../config/env";

const appleIssuer = "https://appleid.apple.com";
const appleJwksUrl = "https://appleid.apple.com/auth/keys";
const jwksCacheTtlMs = 60 * 60 * 1000;

interface AppleJwk extends CryptoJsonWebKey {
  kid: string;
  alg?: string;
  use?: string;
}

interface AppleJwksResponse {
  keys?: AppleJwk[];
}

export interface AppleAuthProfile {
  providerId: string;
  email?: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

export interface AppleVerifyInput {
  identityToken: string;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

@Injectable()
export class AppleAuthService {
  private cachedKeys: AppleJwk[] | null = null;
  private cacheExpiresAt = 0;

  async verifyIdentityToken(input: AppleVerifyInput): Promise<AppleAuthProfile> {
    try {
      const decoded = jwt.decode(input.identityToken, { complete: true });

      if (!isDecodedJwt(decoded)) {
        throw new UnauthorizedException("Invalid Apple identity token");
      }

      const publicKey = await this.getPublicKey(decoded.header);
      const payload = jwt.verify(input.identityToken, publicKey, {
        algorithms: ["RS256"],
        audience: getRequiredAuthEnv("APPLE_CLIENT_ID"),
        issuer: appleIssuer,
      });

      if (!isJwtPayload(payload) || !payload.sub) {
        throw new UnauthorizedException("Invalid Apple identity token");
      }

      const email = normalizeOptionalString(payload.email) ?? input.user?.email;

      return {
        providerId: payload.sub,
        email,
        emailVerified: isAppleEmailVerified(payload.email_verified),
        firstName: normalizeOptionalString(input.user?.firstName),
        lastName: normalizeOptionalString(input.user?.lastName),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid Apple identity token");
    }
  }

  private async getPublicKey(header: JwtHeader): Promise<KeyObject> {
    if (header.alg !== "RS256" || !header.kid) {
      throw new UnauthorizedException("Invalid Apple identity token");
    }

    const keys = await this.getAppleKeys();
    const key = keys.find((candidate) => candidate.kid === header.kid);

    if (!key) {
      this.cachedKeys = null;
      const freshKeys = await this.getAppleKeys();
      const freshKey = freshKeys.find((candidate) => candidate.kid === header.kid);

      if (!freshKey) {
        throw new UnauthorizedException("Invalid Apple identity token");
      }

      return createPublicKey({ key: freshKey as CryptoJsonWebKey, format: "jwk" });
    }

    return createPublicKey({ key: key as CryptoJsonWebKey, format: "jwk" });
  }

  private async getAppleKeys(): Promise<AppleJwk[]> {
    if (this.cachedKeys && this.cacheExpiresAt > Date.now()) {
      return this.cachedKeys;
    }

    const response = await fetch(appleJwksUrl);

    if (!response.ok) {
      throw new UnauthorizedException("Invalid Apple identity token");
    }

    const body = (await response.json()) as AppleJwksResponse;
    const keys = Array.isArray(body.keys) ? body.keys : [];

    this.cachedKeys = keys;
    this.cacheExpiresAt = Date.now() + jwksCacheTtlMs;

    return keys;
  }
}

function isDecodedJwt(
  decoded: string | JwtPayload | null,
): decoded is { header: JwtHeader; payload: JwtPayload } {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    "header" in decoded &&
    typeof decoded.header === "object" &&
    decoded.header !== null &&
    "payload" in decoded &&
    typeof decoded.payload === "object" &&
    decoded.payload !== null
  );
}

function isJwtPayload(payload: string | JwtPayload): payload is JwtPayload {
  return typeof payload === "object" && payload !== null;
}

function isAppleEmailVerified(value: unknown): boolean {
  return value === true || value === "true";
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
