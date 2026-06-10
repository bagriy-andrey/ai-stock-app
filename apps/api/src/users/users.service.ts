import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  AuthProviderFlags,
  UpdateProfileRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import {
  isPhoneNumberLikeIdentifier,
  normalizePhoneNumber,
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
  phoneNumber?: string;
  passwordHash: string;
}

export interface UserCredentialsDto extends UserDto {
  passwordHash?: string;
}

export interface PasswordResetUserDto {
  id: string;
  authProviders: AuthProviderFlags;
  passwordHash?: string;
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
    const phoneNumber = input.phoneNumber
      ? normalizePhoneNumber(input.phoneNumber) ?? undefined
      : undefined;

    await this.assertEmailNicknameAndPhoneAvailable(email, nickname, phoneNumber);

    try {
      const user = await this.userModel.create({
        email,
        nickname,
        ...(phoneNumber ? { phoneNumber } : {}),
        passwordHash: input.passwordHash,
        emailVerified: false,
        authProviders: {
          google: false,
          email: true,
          apple: false,
          facebook: false,
          phone: Boolean(phoneNumber),
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

  async findByEmailOrNicknameForLogin(
    identifier: string,
  ): Promise<UserCredentialsDto | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    if (isPhoneNumberLikeIdentifier(identifier)) {
      const phoneNumber = normalizePhoneNumber(identifier);

      if (phoneNumber) {
        const userByPhone = await this.findOneWithPasswordHash({ phoneNumber });

        if (userByPhone) {
          return this.toCredentialsDto(userByPhone);
        }
      }
    }

    const userByEmail = await this.findOneWithPasswordHash({
      email: normalizedIdentifier,
    });

    if (userByEmail) {
      return this.toCredentialsDto(userByEmail);
    }

    const userByNickname = await this.findOneWithPasswordHash({
      nickname: normalizedIdentifier,
    });

    return userByNickname ? this.toCredentialsDto(userByNickname) : null;
  }

  async findByEmailForPasswordReset(
    email: string,
  ): Promise<PasswordResetUserDto | null> {
    const user = await this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select("+passwordHash")
      .exec();

    return user ? this.toPasswordResetDto(user) : null;
  }

  async storePasswordResetTokenHash(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      })
      .exec();
  }

  async resetPasswordByTokenHash(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<boolean> {
    const user = await this.userModel
      .findOneAndUpdate(
        {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { $gt: now },
        },
        {
          $set: {
            passwordHash,
            "authProviders.email": true,
          },
          $unset: {
            passwordResetTokenHash: 1,
            passwordResetExpiresAt: 1,
          },
        },
        { new: true },
      )
      .exec();

    return Boolean(user);
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

    let user: UserDocument | null;

    try {
      user = await this.userModel
        .findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .exec();
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }

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
    const $setBooleans: Record<string, boolean> = {};
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

    if (input.phoneNumber === null) {
      $unset.phoneNumber = 1;
      $setBooleans.phoneVerified = false;
      $setBooleans["authProviders.phone"] = false;
    } else if (input.phoneNumber !== undefined) {
      $set.phoneNumber = input.phoneNumber;
      $setBooleans.phoneVerified = false;
      $setBooleans["authProviders.phone"] = true;
    }

    return {
      ...(Object.keys($set).length > 0 || Object.keys($setBooleans).length > 0
        ? { $set: { ...$set, ...$setBooleans } }
        : {}),
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

  private async assertEmailNicknameAndPhoneAvailable(
    email: string,
    nickname: string,
    phoneNumber: string | undefined,
  ): Promise<void> {
    const userByEmail = await this.userModel.findOne({ email }).exec();

    if (userByEmail) {
      throw new ConflictException("Email already exists");
    }

    const userByNickname = await this.userModel.findOne({ nickname }).exec();

    if (userByNickname) {
      throw new ConflictException("Nickname already exists");
    }

    if (!phoneNumber) {
      return;
    }

    const userByPhone = await this.userModel.findOne({ phoneNumber }).exec();

    if (userByPhone) {
      throw new ConflictException("Phone number already exists");
    }
  }

  private findOneWithPasswordHash(
    filter: Record<string, string>,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).select("+passwordHash").exec();
  }

  private toCredentialsDto(user: UserDocument): UserCredentialsDto {
    return {
      ...this.toDto(user),
      passwordHash: user.passwordHash,
    };
  }

  private toPasswordResetDto(user: UserDocument): PasswordResetUserDto {
    return {
      id: user._id.toString(),
      authProviders: normalizeAuthProviderFlags(user.authProviders),
      passwordHash: user.passwordHash,
    };
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

  if ("phoneNumber" in keyPattern || "phoneNumber" in keyValue) {
    throw new ConflictException("Phone number already exists");
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
