import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { TokenPayload } from "google-auth-library";
import { AuthService } from "./auth.service";
import type { UsersService } from "../users/users.service";

describe("AuthService", () => {
  type AuthServiceWithVerifier = {
    verifyGoogleCredential: jest.Mock<Promise<TokenPayload>, [string]>;
  };
  const baseGooglePayload: Pick<TokenPayload, "iss" | "sub" | "aud" | "iat" | "exp"> = {
    iss: "https://accounts.google.com",
    sub: "google-user-id",
    aud: "google-client-id",
    iat: 1780387200,
    exp: 1780390800,
  };

  const usersService = {
    findOrCreateFromGoogle: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<Pick<UsersService, "findOrCreateFromGoogle" | "findById">>;
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, "signAsync">>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
  });

  it("creates or updates a verified Google user and returns a JWT", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
    };
    usersService.findOrCreateFromGoogle.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
    (service as unknown as AuthServiceWithVerifier).verifyGoogleCredential = jest
      .fn<Promise<TokenPayload>, [string]>()
      .mockResolvedValue({
        ...baseGooglePayload,
        email: user.email,
        email_verified: true,
        name: user.name,
        picture: user.avatarUrl,
      });

    await expect(service.loginWithGoogle("google-id-token")).resolves.toEqual({
      accessToken: "app-jwt",
      user,
    });
    expect(usersService.findOrCreateFromGoogle).toHaveBeenCalledWith({
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });
  });

  it("rejects Google accounts without a verified email", async () => {
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
    (service as unknown as AuthServiceWithVerifier).verifyGoogleCredential = jest
      .fn<Promise<TokenPayload>, [string]>()
      .mockResolvedValue({
        ...baseGooglePayload,
        email: "test@example.com",
        email_verified: false,
      });

    await expect(service.loginWithGoogle("google-id-token")).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
