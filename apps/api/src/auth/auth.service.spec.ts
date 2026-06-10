import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import type { GoogleAuthService, GoogleAuthProfile } from "./google-auth.service";
import type { UsersService } from "../users/users.service";
import type { PasswordHashingService } from "./password-hashing.service";

describe("AuthService", () => {
  const usersService = {
    findOrCreateFromGoogle: jest.fn(),
    createWithEmail: jest.fn(),
    findByEmailOrNicknameForLogin: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      UsersService,
      | "findOrCreateFromGoogle"
      | "createWithEmail"
      | "findByEmailOrNicknameForLogin"
      | "findById"
    >
  >;
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<Pick<JwtService, "signAsync">>;
  const googleAuthService = {
    verifyCredential: jest.fn(),
  } as unknown as jest.Mocked<Pick<GoogleAuthService, "verifyCredential">>;
  const passwordHashingService = {
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<PasswordHashingService, "hashPassword" | "verifyPassword">
  >;

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
      passwordHashingService as unknown as PasswordHashingService,
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
      passwordHashingService as unknown as PasswordHashingService,
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
      passwordHashingService as unknown as PasswordHashingService,
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

  it("registers an email user and returns the common AuthResponse", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "test",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
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
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:salt:hash");
    usersService.createWithEmail.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.registerWithEmail({
        email: " TEST@example.com ",
        nickname: " Test ",
        password: "StrongPassword123",
      }),
    ).resolves.toEqual({
      accessToken: "app-jwt",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: undefined,
        lastName: undefined,
        avatarUrl: undefined,
        authProviders: user.authProviders,
        twoFactorEnabled: false,
      },
    });
    expect(passwordHashingService.hashPassword).toHaveBeenCalledWith(
      "StrongPassword123",
    );
    expect(usersService.createWithEmail).toHaveBeenCalledWith({
      email: "test@example.com",
      nickname: "test",
      passwordHash: "scrypt:salt:hash",
    });
    expect(usersService.createWithEmail).not.toHaveBeenCalledWith(
      expect.objectContaining({ password: "StrongPassword123" }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });
  });

  it("logs in with email and returns the common AuthResponse", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "andrey",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
      passwordHash: "$2b$12$password-hash",
    };
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue(user);
    passwordHashingService.verifyPassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.loginWithEmail({
        identifier: "test@example.com",
        password: "StrongPassword123",
      }),
    ).resolves.toEqual({
      accessToken: "app-jwt",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: undefined,
        lastName: undefined,
        avatarUrl: undefined,
        authProviders: user.authProviders,
        twoFactorEnabled: false,
      },
    });
    expect(usersService.findByEmailOrNicknameForLogin).toHaveBeenCalledWith(
      "test@example.com",
    );
    expect(passwordHashingService.verifyPassword).toHaveBeenCalledWith(
      "StrongPassword123",
      user.passwordHash,
    );
  });

  it("logs in with nickname", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "andrey",
      nickname: "andrey",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
      passwordHash: "$2b$12$password-hash",
    };
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue(user);
    passwordHashingService.verifyPassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.loginWithEmail({
        identifier: "andrey",
        password: "StrongPassword123",
      }),
    ).resolves.toMatchObject({
      accessToken: "app-jwt",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        authProviders: user.authProviders,
        twoFactorEnabled: false,
      },
    });
    expect(usersService.findByEmailOrNicknameForLogin).toHaveBeenCalledWith(
      "andrey",
    );
  });

  it("rejects invalid passwords with a generic authentication error", async () => {
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue({
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "andrey",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
      passwordHash: "$2b$12$password-hash",
    });
    passwordHashingService.verifyPassword.mockResolvedValue(false);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.loginWithEmail({
        identifier: "test@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials"));
  });

  it("rejects unknown email or nickname with a generic authentication error", async () => {
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue(null);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.loginWithEmail({
        identifier: "missing@example.com",
        password: "StrongPassword123",
      }),
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials"));
    await expect(
      service.loginWithEmail({
        identifier: "missing-nickname",
        password: "StrongPassword123",
      }),
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials"));
  });

  it("rejects users without a password hash", async () => {
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue({
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
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
    });
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.loginWithEmail({
        identifier: "test@example.com",
        password: "StrongPassword123",
      }),
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials"));
    expect(passwordHashingService.verifyPassword).not.toHaveBeenCalled();
  });

  it("does not expose passwordHash in email login responses", async () => {
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue({
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "andrey",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en" as const,
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
      passwordHash: "$2b$12$password-hash",
    });
    passwordHashingService.verifyPassword.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    const response = await service.loginWithEmail({
      identifier: "test@example.com",
      password: "StrongPassword123",
    });

    expect(response).toHaveProperty("accessToken", "app-jwt");
    expect(response).toHaveProperty("user");
    expect(response.user).not.toHaveProperty("passwordHash");
    expect(response.user).not.toHaveProperty("providerIds");
    expect(response.user).not.toHaveProperty("totpSecret");
    expect(response.user).not.toHaveProperty("resetPasswordToken");
    expect(response.user).not.toHaveProperty("resetPasswordExpires");
  });
});
