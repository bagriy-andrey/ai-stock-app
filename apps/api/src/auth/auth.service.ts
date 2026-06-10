import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import type {
  AuthProviderFlags,
  AuthResponse,
  AuthUser,
  AppleLoginRequest,
  ForgotPasswordResponse,
  LoginWithEmailRequest,
  RegisterWithEmailRequest,
  ResetPasswordResponse,
  UserDto,
} from "@ai-stock-advisor/shared";
import { normalizePhoneNumber } from "@ai-stock-advisor/shared";
import { UsersService } from "../users/users.service";
import { EmailService } from "./email.service";
import { AppleAuthService } from "./apple-auth.service";
import { FacebookAuthService } from "./facebook-auth.service";
import { GoogleAuthService } from "./google-auth.service";
import type { JwtPayload } from "./jwt-payload";
import { PasswordHashingService } from "./password-hashing.service";

export const forgotPasswordSuccessMessage =
  "If an account with this email exists, password reset instructions have been sent.";

const passwordResetTokenBytes = 32;
const passwordResetTokenTtlMs = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly emailService: EmailService = new EmailService(),
    private readonly appleAuthService: AppleAuthService = new AppleAuthService(),
    private readonly facebookAuthService: FacebookAuthService = new FacebookAuthService(),
  ) {}

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const profile = await this.googleAuthService.verifyCredential(credential);
    const email = profile.email;

    if (!email || !profile.emailVerified) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const user = await this.usersService.findOrCreateFromGoogle({
      email,
      providerId: profile.providerId,
      name: profile.name,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      emailVerified: profile.emailVerified,
    });

    return this.buildAuthResponse(user);
  }

  async loginWithApple(input: AppleLoginRequest): Promise<AuthResponse> {
    const profile = await this.appleAuthService.verifyIdentityToken({
      identityToken: input.identityToken,
      user: input.user,
    });
    const user = await this.usersService.findOrCreateFromApple({
      providerId: profile.providerId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstName: profile.firstName,
      lastName: profile.lastName,
    });

    return this.buildAuthResponse(user);
  }

  async loginWithFacebook(accessToken: string): Promise<AuthResponse> {
    const profile = await this.facebookAuthService.verifyAccessToken(accessToken);
    const user = await this.usersService.findOrCreateFromFacebook({
      providerId: profile.providerId,
      email: profile.email,
      emailVerified: profile.emailVerified,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
    });

    return this.buildAuthResponse(user);
  }

  async registerWithEmail(
    input: RegisterWithEmailRequest,
  ): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const nickname = input.nickname.trim().toLowerCase();
    const phoneNumber = input.phoneNumber
      ? normalizePhoneNumber(input.phoneNumber) ?? undefined
      : undefined;

    if (input.phoneNumber && !phoneNumber) {
      throw new BadRequestException("Invalid phone number");
    }

    const passwordHash = await this.passwordHashingService.hashPassword(
      input.password,
    );
    const user = await this.usersService.createWithEmail({
      email,
      nickname,
      phoneNumber,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async loginWithEmail(input: LoginWithEmailRequest): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailOrNicknameForLogin(
      input.identifier,
    );

    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordHashingService.verifyPassword(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildAuthResponse(user);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmailForPasswordReset(
      normalizedEmail,
    );

    if (user?.passwordHash && user.authProviders.email) {
      try {
        // TODO: Add IP/email rate limiting when API-wide throttling is introduced.
        const rawToken = randomBytes(passwordResetTokenBytes).toString("hex");
        const tokenHash = hashPasswordResetToken(rawToken);
        const expiresAt = new Date(Date.now() + passwordResetTokenTtlMs);

        await this.usersService.storePasswordResetTokenHash(
          user.id,
          tokenHash,
          expiresAt,
        );
        await this.emailService.sendPasswordResetEmail(
          normalizedEmail,
          buildPasswordResetUrl(rawToken),
        );
      } catch (error) {
        this.logger.error(
          `Failed to prepare password reset instructions for user ${user.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      success: true,
      message: forgotPasswordSuccessMessage,
    };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<ResetPasswordResponse> {
    const tokenHash = hashPasswordResetToken(token);
    const passwordHash = await this.passwordHashingService.hashPassword(password);
    const wasReset = await this.usersService.resetPasswordByTokenHash(
      tokenHash,
      passwordHash,
      new Date(),
    );

    if (!wasReset) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // TODO: Invalidate persisted refresh tokens/sessions here if the app adds them.
    return {
      success: true,
      message: "Password has been reset successfully.",
    };
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    return this.toAuthUser(await this.usersService.findById(userId));
  }

  private async buildAuthResponse(user: UserDto): Promise<AuthResponse> {
    return {
      accessToken: await this.signUser(user),
      user: this.toAuthUser(user),
    };
  }

  private signUser(user: UserDto): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload);
  }

  private toAuthUser(user: UserDto): AuthUser {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified === true,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      authProviders: normalizeAuthProviderFlags(user.authProviders),
      twoFactorEnabled: user.twoFactorEnabled === true,
    };
  }
}

function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildPasswordResetUrl(rawToken: string): string {
  const appWebUrl = (process.env.APP_WEB_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  return `${appWebUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
}

function normalizeAuthProviderFlags(
  authProviders: Partial<AuthProviderFlags> | undefined,
): AuthProviderFlags {
  return {
    google: authProviders?.google === true,
    email: authProviders?.email === true,
    apple: authProviders?.apple === true,
    facebook: authProviders?.facebook === true,
    phone: authProviders?.phone === true,
  };
}
