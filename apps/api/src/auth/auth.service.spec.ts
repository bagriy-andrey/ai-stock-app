import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import type { GoogleAuthService, GoogleAuthProfile } from "./google-auth.service";
import type { UsersService } from "../users/users.service";

describe("AuthService", () => {
  const usersService = {
    findOrCreateFromGoogle: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<Pick<UsersService, "findOrCreateFromGoogle" | "findById">>;
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, "signAsync">>;
  const googleAuthService = {
    verifyCredential: jest.fn(),
  } as unknown as jest.Mocked<Pick<GoogleAuthService, "verifyCredential">>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
  });

  it("creates or updates a verified Google user and returns a JWT", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: true,
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      nickname: "Tester",
      phoneVerified: false,
      avatarUrl: "https://example.com/avatar.png",
      authProviders: {
        google: true,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
    };
    usersService.findOrCreateFromGoogle.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    googleAuthService.verifyCredential.mockResolvedValue({
      providerId: "google-user-id",
      email: user.email,
      emailVerified: true,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    });
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
    );

    await expect(service.loginWithGoogle("google-id-token")).resolves.toEqual({
      accessToken: "app-jwt",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        authProviders: user.authProviders,
        twoFactorEnabled: false,
      },
    });
    expect(googleAuthService.verifyCredential).toHaveBeenCalledWith("google-id-token");
    expect(usersService.findOrCreateFromGoogle).toHaveBeenCalledWith({
      email: user.email,
      providerId: "google-user-id",
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      emailVerified: true,
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
      googleAuthService as unknown as GoogleAuthService,
    );
    googleAuthService.verifyCredential.mockResolvedValue({
      providerId: "google-user-id",
      email: "test@example.com",
      emailVerified: false,
    });

    await expect(service.loginWithGoogle("google-id-token")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("does not expose sensitive user fields in AuthResponse", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: true,
      name: "Test User",
      phoneVerified: false,
      authProviders: {
        google: true,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: true,
      twoFactorMethod: "totp" as const,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
      passwordHash: "secret-hash",
      providerIds: { google: "google-user-id" },
    };
    usersService.findOrCreateFromGoogle.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    googleAuthService.verifyCredential.mockResolvedValue({
      providerId: "google-user-id",
      email: user.email,
      emailVerified: true,
      name: user.name,
    } satisfies GoogleAuthProfile);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
    );

    const response = await service.loginWithGoogle("google-id-token");

    expect(response.user).toEqual({
      id: user.id,
      email: user.email,
      nickname: undefined,
      firstName: undefined,
      lastName: undefined,
      avatarUrl: undefined,
      authProviders: user.authProviders,
      twoFactorEnabled: true,
    });
    expect(response.user).not.toHaveProperty("passwordHash");
    expect(response.user).not.toHaveProperty("providerIds");
  });
});
