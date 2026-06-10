import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type {
  AuthProviderFlags,
  AuthResponse,
  AuthUser,
  LoginWithEmailRequest,
  RegisterWithEmailRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import { normalizePhoneNumber } from "@ai-stock-advisor/shared";
import { UsersService } from "../users/users.service";
import { GoogleAuthService } from "./google-auth.service";
import type { JwtPayload } from "./jwt-payload";
import { PasswordHashingService } from "./password-hashing.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly passwordHashingService: PasswordHashingService,
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
