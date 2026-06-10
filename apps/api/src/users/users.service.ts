import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  AuthProviderFlags,
  UpdateProfileRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import { normalizeProfileLanguage } from "./profile-language";

export interface GoogleUserProfile {
  email: string;
  providerId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export interface EmailUserInput {
  email: string;
  nickname: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreateFromGoogle(profile: GoogleUserProfile): Promise<UserDto> {
    const email = profile.email.toLowerCase();
    const existingUser = await this.findExistingGoogleUser(email, profile.providerId);
    const displayName = buildDisplayName(profile, email);
    const $set = removeUndefinedValues({
      email,
      name: displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      emailVerified: profile.emailVerified,
      "authProviders.google": true,
      ...(profile.providerId ? { "providerIds.google": profile.providerId } : {}),
    });
    const user = await this.userModel
      .findOneAndUpdate(
        existingUser ? { _id: existingUser._id } : { email },
        {
          $set,
          $setOnInsert: {
            language: "en",
            watchlistViewMode: "grid",
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      )
      .exec();

    return this.toDto(user);
  }

  async createWithEmail(input: EmailUserInput): Promise<UserDto> {
    const email = input.email.trim().toLowerCase();
    const nickname = input.nickname.trim().toLowerCase();

    await this.assertEmailAndNicknameAvailable(email, nickname);

    try {
      const user = await this.userModel.create({
        email,
        nickname,
        passwordHash: input.passwordHash,
        emailVerified: false,
        authProviders: {
          google: false,
          email: true,
          apple: false,
          facebook: false,
          phone: false,
        },
        phoneVerified: false,
        twoFactorEnabled: false,
        twoFactorMethod: null,
        language: "en",
        watchlistViewMode: "grid",
      });

      return this.toDto(user);
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("User not found");
    }

    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  async updateProfile(id: string, input: UpdateProfileRequest): Promise<UserDto> {
    const update = this.buildProfileUpdate(input);

    if (Object.keys(update).length === 0) {
      return this.findById(id);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  async updateAvatar(id: string, avatarUrl?: string): Promise<UserDto> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        avatarUrl ? { $set: { avatarUrl } } : { $unset: { avatarUrl: 1 } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  private buildProfileUpdate(input: UpdateProfileRequest): Record<string, unknown> {
    const $set: Record<string, string> = {};
    const $unset: Record<string, 1> = {};

    for (const field of ["firstName", "lastName", "nickname"] as const) {
      const value = input[field];

      if (value === null) {
        $unset[field] = 1;
      } else if (value !== undefined) {
        $set[field] = value;
      }
    }

    for (const field of ["language", "theme", "watchlistViewMode"] as const) {
      const value = input[field];

      if (value !== undefined) {
        $set[field] = value;
      }
    }

    return {
      ...(Object.keys($set).length > 0 ? { $set } : {}),
      ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    };
  }

  private async findExistingGoogleUser(
    email: string,
    providerId: string | undefined,
  ): Promise<UserDocument | null> {
    if (providerId) {
      const userByProviderId = await this.userModel
        .findOne({ "providerIds.google": providerId })
        .exec();

      if (userByProviderId) {
        return userByProviderId;
      }
    }

    return this.userModel.findOne({ email }).exec();
  }

  private async assertEmailAndNicknameAvailable(
    email: string,
    nickname: string,
  ): Promise<void> {
    const userByEmail = await this.userModel.findOne({ email }).exec();

    if (userByEmail) {
      throw new ConflictException("Email already exists");
    }

    const userByNickname = await this.userModel.findOne({ nickname }).exec();

    if (userByNickname) {
      throw new ConflictException("Nickname already exists");
    }
  }

  private toDto(user: UserDocument): UserDto {
    const email = user.email;
    const name = user.name ?? buildFallbackName(user, email ?? "");

    return {
      id: user._id.toString(),
      email,
      emailVerified: user.emailVerified === true,
      name,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified === true,
      avatarUrl: user.avatarUrl,
      authProviders: normalizeAuthProviderFlags(user.authProviders),
      twoFactorEnabled: user.twoFactorEnabled === true,
      twoFactorMethod: user.twoFactorMethod === "totp" ? "totp" : null,
      language: normalizeProfileLanguage(user.language),
      theme: user.theme,
      watchlistViewMode:
        user.watchlistViewMode === "list" ? "list" : "grid",
      telegramChatId: user.telegramChatId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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

function buildDisplayName(profile: GoogleUserProfile, email: string): string {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  return profile.name ?? (fullName || email);
}

function buildFallbackName(user: UserDocument, email: string): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.nickname ?? (fullName || email || "User");
}

function removeUndefinedValues<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function throwDuplicateKeyConflict(error: unknown): void {
  if (!isMongoDuplicateKeyError(error)) {
    return;
  }

  const keyPattern = error.keyPattern ?? {};
  const keyValue = error.keyValue ?? {};

  if ("email" in keyPattern || "email" in keyValue) {
    throw new ConflictException("Email already exists");
  }

  if ("nickname" in keyPattern || "nickname" in keyValue) {
    throw new ConflictException("Nickname already exists");
  }

  throw new ConflictException("User already exists");
}

function isMongoDuplicateKeyError(
  error: unknown,
): error is {
  code: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}
