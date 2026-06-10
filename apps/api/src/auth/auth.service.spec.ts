import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash } from "node:crypto";
import { AuthService, forgotPasswordSuccessMessage } from "./auth.service";
import type { EmailService } from "./email.service";
import type { GoogleAuthService, GoogleAuthProfile } from "./google-auth.service";
import type { UsersService } from "../users/users.service";
import type { PasswordHashingService } from "./password-hashing.service";

describe("AuthService", () => {
  const usersService = {
    findOrCreateFromGoogle: jest.fn(),
    createWithEmail: jest.fn(),
    findByEmailOrNicknameForLogin: jest.fn(),
    findByEmailForPasswordReset: jest.fn(),
    findById: jest.fn(),
    storePasswordResetTokenHash: jest.fn(),
    resetPasswordByTokenHash: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      UsersService,
      | "findOrCreateFromGoogle"
      | "createWithEmail"
      | "findByEmailOrNicknameForLogin"
      | "findByEmailForPasswordReset"
      | "findById"
      | "storePasswordResetTokenHash"
      | "resetPasswordByTokenHash"
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
  const emailService = {
    sendPasswordResetEmail: jest.fn(),
  } as unknown as jest.Mocked<Pick<EmailService, "sendPasswordResetEmail">>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.APP_WEB_URL = "http://localhost:3000";
  });

  afterEach(() => {
    jest.useRealTimers();
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
        phoneNumber: undefined,
        phoneVerified: false,
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
      phoneNumber: undefined,
      phoneVerified: false,
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
        phoneNumber: undefined,
        phoneVerified: false,
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
      phoneNumber: undefined,
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

  it("registers an email user with a normalized phone number", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "test",
      phoneNumber: "+48500111222",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: true,
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
        email: "test@example.com",
        nickname: "test",
        phoneNumber: "+48 500 111 222",
        password: "StrongPassword123",
      }),
    ).resolves.toMatchObject({
      accessToken: "app-jwt",
      user: {
        phoneNumber: "+48500111222",
        phoneVerified: false,
        authProviders: expect.objectContaining({ phone: true }),
      },
    });
    expect(usersService.createWithEmail).toHaveBeenCalledWith({
      email: "test@example.com",
      nickname: "test",
      phoneNumber: "+48500111222",
      passwordHash: "scrypt:salt:hash",
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
        phoneNumber: undefined,
        phoneVerified: false,
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
        phoneVerified: false,
        authProviders: user.authProviders,
        twoFactorEnabled: false,
      },
    });
    expect(usersService.findByEmailOrNicknameForLogin).toHaveBeenCalledWith(
      "andrey",
    );
  });

  it("logs in with phone number", async () => {
    const user = {
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "andrey",
      nickname: "andrey",
      phoneNumber: "+380671234567",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: true,
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
        identifier: "+380 67 123 45 67",
        password: "StrongPassword123",
      }),
    ).resolves.toMatchObject({
      user: {
        phoneNumber: "+380671234567",
        phoneVerified: false,
      },
    });
    expect(usersService.findByEmailOrNicknameForLogin).toHaveBeenCalledWith(
      "+380 67 123 45 67",
    );
    expect(passwordHashingService.verifyPassword).toHaveBeenCalledWith(
      "StrongPassword123",
      user.passwordHash,
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

  it("rejects phone login with a wrong password", async () => {
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue({
      id: "user-id",
      email: "test@example.com",
      emailVerified: false,
      name: "test",
      nickname: "andrey",
      phoneNumber: "+48500111222",
      phoneVerified: false,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: true,
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
        identifier: "+48 500 111 222",
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
    await expect(
      service.loginWithEmail({
        identifier: "+48 500 111 222",
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

  it("returns generic success for an existing eligible email and stores only a hashed reset token", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-02T09:00:00.000Z"));
    usersService.findByEmailForPasswordReset.mockResolvedValue({
      id: "user-id",
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      passwordHash: "scrypt:salt:hash",
    });
    usersService.storePasswordResetTokenHash.mockResolvedValue(undefined);
    emailService.sendPasswordResetEmail.mockResolvedValue(undefined);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
      emailService as unknown as EmailService,
    );

    await expect(service.forgotPassword(" USER@example.com ")).resolves.toEqual({
      success: true,
      message: forgotPasswordSuccessMessage,
    });

    expect(usersService.findByEmailForPasswordReset).toHaveBeenCalledWith(
      "user@example.com",
    );
    expect(usersService.storePasswordResetTokenHash).toHaveBeenCalledTimes(1);
    const [, storedHash, expiresAt] =
      usersService.storePasswordResetTokenHash.mock.calls[0];
    expect(expiresAt).toEqual(new Date("2026-06-02T09:30:00.000Z"));
    expect(storedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [email, resetUrl] = emailService.sendPasswordResetEmail.mock.calls[0];
    const rawToken = new URL(resetUrl).searchParams.get("token");

    expect(email).toBe("user@example.com");
    expect(resetUrl).toMatch(
      /^http:\/\/localhost:3000\/auth\/reset-password\?token=/,
    );
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(storedHash).not.toBe(rawToken);
    expect(storedHash).toBe(
      createHash("sha256").update(rawToken ?? "").digest("hex"),
    );

    jest.useRealTimers();
  });

  it("returns generic success for a non-existing email without generating a token", async () => {
    usersService.findByEmailForPasswordReset.mockResolvedValue(null);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
      emailService as unknown as EmailService,
    );

    await expect(service.forgotPassword("missing@example.com")).resolves.toEqual({
      success: true,
      message: forgotPasswordSuccessMessage,
    });
    expect(usersService.storePasswordResetTokenHash).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not generate a reset token for social-only users", async () => {
    usersService.findByEmailForPasswordReset.mockResolvedValue({
      id: "user-id",
      authProviders: {
        google: true,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
    });
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
      emailService as unknown as EmailService,
    );

    await expect(service.forgotPassword("google@example.com")).resolves.toEqual({
      success: true,
      message: forgotPasswordSuccessMessage,
    });
    expect(usersService.storePasswordResetTokenHash).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not expose reset token fields in auth responses", async () => {
    const userWithResetFields = {
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
      passwordResetTokenHash: "hashed-token",
      passwordResetExpiresAt: new Date("2026-06-02T09:30:00.000Z"),
    };
    usersService.findByEmailOrNicknameForLogin.mockResolvedValue(userWithResetFields);
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

    expect(response.user).not.toHaveProperty("passwordResetTokenHash");
    expect(response.user).not.toHaveProperty("passwordResetExpiresAt");
  });

  it("resets a password with a valid reset token", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-02T09:10:00.000Z"));
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:new-salt:new-hash");
    usersService.resetPasswordByTokenHash.mockResolvedValue(true);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.resetPassword("raw-reset-token", "NewStrongPassword123"),
    ).resolves.toEqual({
      success: true,
      message: "Password has been reset successfully.",
    });
    expect(passwordHashingService.hashPassword).toHaveBeenCalledWith(
      "NewStrongPassword123",
    );
    expect(usersService.resetPasswordByTokenHash).toHaveBeenCalledWith(
      createHash("sha256").update("raw-reset-token").digest("hex"),
      "scrypt:new-salt:new-hash",
      new Date("2026-06-02T09:10:00.000Z"),
    );

    jest.useRealTimers();
  });

  it("rejects invalid or expired reset tokens with a generic bad request", async () => {
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:new-salt:new-hash");
    usersService.resetPasswordByTokenHash.mockResolvedValue(false);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.resetPassword("invalid-token", "NewStrongPassword123"),
    ).rejects.toThrow(
      new BadRequestException("Invalid or expired reset token"),
    );
  });

  it("rejects reuse of the same reset token", async () => {
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:new-salt:new-hash");
    usersService.resetPasswordByTokenHash
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await expect(
      service.resetPassword("raw-reset-token", "NewStrongPassword123"),
    ).resolves.toEqual({
      success: true,
      message: "Password has been reset successfully.",
    });
    await expect(
      service.resetPassword("raw-reset-token", "AnotherStrongPassword123"),
    ).rejects.toThrow(
      new BadRequestException("Invalid or expired reset token"),
    );
  });

  it("allows login with the new password after reset and rejects the old password", async () => {
    let currentPasswordHash = "scrypt:old-salt:old-hash";
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
    };
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:new-salt:new-hash");
    passwordHashingService.verifyPassword.mockImplementation(
      async (password, hash) =>
        password === "NewStrongPassword123" &&
        hash === "scrypt:new-salt:new-hash",
    );
    usersService.resetPasswordByTokenHash.mockImplementation(
      async (_tokenHash, passwordHash) => {
        currentPasswordHash = passwordHash;
        return true;
      },
    );
    usersService.findByEmailOrNicknameForLogin.mockImplementation(async () => ({
      ...user,
      passwordHash: currentPasswordHash,
    }));
    jwtService.signAsync.mockResolvedValue("app-jwt");
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    await service.resetPassword("raw-reset-token", "NewStrongPassword123");

    await expect(
      service.loginWithEmail({
        identifier: "test@example.com",
        password: "NewStrongPassword123",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    await expect(
      service.loginWithEmail({
        identifier: "test@example.com",
        password: "OldStrongPassword123",
      }),
    ).rejects.toThrow(new UnauthorizedException("Invalid credentials"));
  });

  it("does not expose sensitive fields in reset password responses", async () => {
    passwordHashingService.hashPassword.mockResolvedValue("scrypt:new-salt:new-hash");
    usersService.resetPasswordByTokenHash.mockResolvedValue(true);
    const service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      googleAuthService as unknown as GoogleAuthService,
      passwordHashingService as unknown as PasswordHashingService,
    );

    const response = await service.resetPassword(
      "raw-reset-token",
      "NewStrongPassword123",
    );

    expect(response).toEqual({
      success: true,
      message: "Password has been reset successfully.",
    });
    expect(response).not.toHaveProperty("passwordHash");
    expect(response).not.toHaveProperty("passwordResetTokenHash");
    expect(response).not.toHaveProperty("passwordResetExpiresAt");
    expect(response).not.toHaveProperty("providerIds");
    expect(response).not.toHaveProperty("totpSecret");
  });
});
