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

export interface AppleUserProfile {
  providerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
}

export interface FacebookUserProfile {
  providerId: string;
  email?: string;
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

export interface UserSecurityInfoDto extends UserDto {
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

  async findOrCreateFromApple(profile: AppleUserProfile): Promise<UserDto> {
    const providerId = profile.providerId.trim();
    const email = normalizeOptionalEmail(profile.email);
    const userByProviderId = await this.findUserByAppleProviderId(providerId);

    if (userByProviderId) {
      return this.toDto(
        await this.updateUserFromApple(userByProviderId, {
          ...profile,
          providerId,
          email,
        }),
      );
    }

    const userByEmail =
      email && profile.emailVerified
        ? await this.findUserByEmailWithProviderIds(email)
        : null;

    if (userByEmail) {
      if (
        userByEmail.providerIds?.apple &&
        userByEmail.providerIds.apple !== providerId
      ) {
        throw new ConflictException("Apple account is already linked");
      }

      return this.toDto(
        await this.updateUserFromApple(userByEmail, {
          ...profile,
          providerId,
          email,
        }),
      );
    }

    try {
      const displayName = buildAppleDisplayName(profile, email);
      const user = await this.userModel.create(
        removeUndefinedValues({
          email,
          name: displayName,
          firstName: normalizeOptionalString(profile.firstName),
          lastName: normalizeOptionalString(profile.lastName),
          emailVerified: profile.emailVerified === true,
          authProviders: {
            google: false,
            email: false,
            apple: true,
            facebook: false,
            phone: false,
          },
          providerIds: {
            apple: providerId,
          },
          phoneVerified: false,
          twoFactorEnabled: false,
          twoFactorMethod: null,
          language: "en",
          watchlistViewMode: "grid",
        }),
      );

      return this.toDto(user);
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }
  }

  async findOrCreateFromFacebook(profile: FacebookUserProfile): Promise<UserDto> {
    const providerId = profile.providerId.trim();
    const email = normalizeOptionalEmail(profile.email);
    const userByProviderId = await this.findUserByFacebookProviderId(providerId);

    if (userByProviderId) {
      return this.toDto(
        await this.updateUserFromFacebook(userByProviderId, {
          ...profile,
          providerId,
          email,
        }),
      );
    }

    const userByEmail = email
      ? await this.findUserByEmailWithProviderIds(email)
      : null;

    if (userByEmail) {
      if (
        userByEmail.providerIds?.facebook &&
        userByEmail.providerIds.facebook !== providerId
      ) {
        throw new ConflictException("Facebook account is already linked");
      }

      return this.toDto(
        await this.updateUserFromFacebook(userByEmail, {
          ...profile,
          providerId,
          email,
        }),
      );
    }

    try {
      const firstName = normalizeOptionalString(profile.firstName);
      const lastName = normalizeOptionalString(profile.lastName);
      const displayName = buildFacebookDisplayName(
        { firstName, lastName },
        email,
      );
      const user = await this.userModel.create(
        removeUndefinedValues({
          email,
          name: displayName,
          firstName,
          lastName,
          avatarUrl: normalizeOptionalString(profile.avatarUrl),
          emailVerified: profile.emailVerified === true,
          authProviders: {
            google: false,
            email: false,
            apple: false,
            facebook: true,
            phone: false,
          },
          providerIds: {
            facebook: providerId,
          },
          phoneVerified: false,
          twoFactorEnabled: false,
          twoFactorMethod: null,
          language: "en",
          watchlistViewMode: "grid",
        }),
      );

      return this.toDto(user);
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }
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

  async findSecurityInfoById(id: string): Promise<UserSecurityInfoDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("User not found");
    }

    const user = await this.userModel
      .findById(id)
      .select("+passwordHash")
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      ...this.toDto(user),
      passwordHash: user.passwordHash,
    };
  }

  async linkGoogleProvider(
    userId: string,
    profile: GoogleUserProfile & { providerId: string },
  ): Promise<UserDto> {
    const providerId = profile.providerId.trim();
    const email = normalizeOptionalEmail(profile.email);
    const currentUser = await this.findUserByIdWithProviderIds(userId);
    const userByProviderId = await this.findUserByGoogleProviderId(providerId);

    assertProviderAvailableForUser(
      userByProviderId,
      currentUser,
      "This Google account is already connected to another user.",
    );
    await this.assertVerifiedEmailAvailableForUser(
      email,
      profile.emailVerified,
      currentUser,
    );

    return this.toDto(
      await this.updateUserFromGoogle(currentUser, {
        ...profile,
        providerId,
        email,
      }),
    );
  }

  async linkAppleProvider(
    userId: string,
    profile: AppleUserProfile,
  ): Promise<UserDto> {
    const providerId = profile.providerId.trim();
    const email = normalizeOptionalEmail(profile.email);
    const currentUser = await this.findUserByIdWithProviderIds(userId);
    const userByProviderId = await this.findUserByAppleProviderId(providerId);

    assertProviderAvailableForUser(
      userByProviderId,
      currentUser,
      "This Apple account is already connected to another user.",
    );
    await this.assertVerifiedEmailAvailableForUser(
      email,
      profile.emailVerified,
      currentUser,
    );

    return this.toDto(
      await this.updateUserFromApple(currentUser, {
        ...profile,
        providerId,
        email,
      }),
    );
  }

  async linkFacebookProvider(
    userId: string,
    profile: FacebookUserProfile,
  ): Promise<UserDto> {
    const providerId = profile.providerId.trim();
    const email = normalizeOptionalEmail(profile.email);
    const currentUser = await this.findUserByIdWithProviderIds(userId);
    const userByProviderId = await this.findUserByFacebookProviderId(providerId);

    assertProviderAvailableForUser(
      userByProviderId,
      currentUser,
      "This Facebook account is already connected to another user.",
    );
    await this.assertVerifiedEmailAvailableForUser(
      email,
      profile.emailVerified,
      currentUser,
    );

    return this.toDto(
      await this.updateUserFromFacebook(currentUser, {
        ...profile,
        providerId,
        email,
      }),
    );
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

  private async findUserByIdWithProviderIds(
    id: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("User not found");
    }

    const user = await this.userModel
      .findById(id)
      .select("+providerIds")
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  private async findUserByGoogleProviderId(
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ "providerIds.google": providerId })
      .select("+providerIds")
      .exec();
  }

  private async findUserByAppleProviderId(
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ "providerIds.apple": providerId })
      .select("+providerIds")
      .exec();
  }

  private async findUserByFacebookProviderId(
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ "providerIds.facebook": providerId })
      .select("+providerIds")
      .exec();
  }

  private async findUserByEmailWithProviderIds(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select("+providerIds").exec();
  }

  private async assertVerifiedEmailAvailableForUser(
    email: string | undefined,
    emailVerified: boolean,
    currentUser: UserDocument,
  ): Promise<void> {
    if (!email || emailVerified !== true) {
      return;
    }

    const userByEmail = await this.findUserByEmailWithProviderIds(email);

    if (userByEmail && !isSameUser(userByEmail, currentUser)) {
      throw new ConflictException(
        "This provider email is already associated with another account.",
      );
    }
  }

  private async updateUserFromGoogle(
    user: UserDocument,
    profile: Omit<GoogleUserProfile, "email"> & {
      providerId: string;
      email?: string;
    },
  ): Promise<UserDocument> {
    const email = normalizeOptionalEmail(profile.email);
    const emailMatchesExistingUser = Boolean(email && user.email === email);
    const shouldSetEmail = Boolean(email && !user.email);
    const firstName = normalizeOptionalString(profile.firstName);
    const lastName = normalizeOptionalString(profile.lastName);
    const name = normalizeOptionalString(profile.name);
    const avatarUrl = normalizeOptionalString(profile.avatarUrl);
    const displayName = name ?? buildGoogleLinkDisplayName(profile, email);
    const $set = removeUndefinedValues({
      ...(shouldSetEmail ? { email } : {}),
      ...(displayName && !user.name ? { name: displayName } : {}),
      ...(firstName && !user.firstName ? { firstName } : {}),
      ...(lastName && !user.lastName ? { lastName } : {}),
      ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
      ...((shouldSetEmail || emailMatchesExistingUser) && profile.emailVerified
        ? { emailVerified: true }
        : {}),
      "authProviders.google": true,
      "providerIds.google": profile.providerId,
    });

    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: user._id },
          { $set },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException("User not found");
      }

      return updatedUser;
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }
  }

  private async updateUserFromApple(
    user: UserDocument,
    profile: AppleUserProfile,
  ): Promise<UserDocument> {
    const email = normalizeOptionalEmail(profile.email);
    const emailMatchesExistingUser = Boolean(email && user.email === email);
    const shouldSetEmail = Boolean(email && !user.email);
    const firstName = normalizeOptionalString(profile.firstName);
    const lastName = normalizeOptionalString(profile.lastName);
    const displayName = buildAppleDisplayName(profile, email);
    const $set = removeUndefinedValues({
      ...(shouldSetEmail ? { email } : {}),
      ...(displayName && !user.name ? { name: displayName } : {}),
      ...(firstName && !user.firstName ? { firstName } : {}),
      ...(lastName && !user.lastName ? { lastName } : {}),
      ...((shouldSetEmail || emailMatchesExistingUser) && profile.emailVerified
        ? { emailVerified: true }
        : {}),
      "authProviders.apple": true,
      "providerIds.apple": profile.providerId,
    });

    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { _id: user._id },
        { $set },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    return updatedUser;
  }

  private async updateUserFromFacebook(
    user: UserDocument,
    profile: FacebookUserProfile,
  ): Promise<UserDocument> {
    const email = normalizeOptionalEmail(profile.email);
    const emailMatchesExistingUser = Boolean(email && user.email === email);
    const shouldSetEmail = Boolean(email && !user.email);
    const firstName = normalizeOptionalString(profile.firstName);
    const lastName = normalizeOptionalString(profile.lastName);
    const avatarUrl = normalizeOptionalString(profile.avatarUrl);
    const displayName = buildFacebookDisplayName({ firstName, lastName }, email);
    const $set = removeUndefinedValues({
      ...(shouldSetEmail ? { email } : {}),
      ...(displayName && !user.name ? { name: displayName } : {}),
      ...(firstName && !user.firstName ? { firstName } : {}),
      ...(lastName && !user.lastName ? { lastName } : {}),
      ...(avatarUrl && !user.avatarUrl ? { avatarUrl } : {}),
      ...((shouldSetEmail || emailMatchesExistingUser) && profile.emailVerified
        ? { emailVerified: true }
        : {}),
      "authProviders.facebook": true,
      "providerIds.facebook": profile.providerId,
    });

    try {
      const updatedUser = await this.userModel
        .findOneAndUpdate(
          { _id: user._id },
          { $set },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      if (!updatedUser) {
        throw new NotFoundException("User not found");
      }

      return updatedUser;
    } catch (error) {
      throwDuplicateKeyConflict(error);
      throw error;
    }
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

function buildGoogleLinkDisplayName(
  profile: Pick<GoogleUserProfile, "firstName" | "lastName">,
  email: string | undefined,
): string | undefined {
  const fullName = [profile.firstName, profile.lastName]
    .map(normalizeOptionalString)
    .filter(Boolean)
    .join(" ");

  return fullName || email;
}

function buildAppleDisplayName(
  profile: Pick<AppleUserProfile, "firstName" | "lastName">,
  email: string | undefined,
): string | undefined {
  const fullName = [profile.firstName, profile.lastName]
    .map(normalizeOptionalString)
    .filter(Boolean)
    .join(" ");

  return fullName || email;
}

function buildFacebookDisplayName(
  profile: Pick<FacebookUserProfile, "firstName" | "lastName">,
  email: string | undefined,
): string | undefined {
  const fullName = [profile.firstName, profile.lastName]
    .map(normalizeOptionalString)
    .filter(Boolean)
    .join(" ");

  return fullName || email;
}

function buildFallbackName(user: UserDocument, email: string): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.nickname ?? (fullName || email || "User");
}

function normalizeOptionalEmail(email: string | undefined): string | undefined {
  return normalizeOptionalString(email)?.toLowerCase();
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function removeUndefinedValues<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function assertProviderAvailableForUser(
  userByProviderId: UserDocument | null,
  currentUser: UserDocument,
  conflictMessage: string,
): void {
  if (userByProviderId && !isSameUser(userByProviderId, currentUser)) {
    throw new ConflictException(conflictMessage);
  }
}

function isSameUser(first: UserDocument, second: UserDocument): boolean {
  return first._id.toString() === second._id.toString();
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

  if ("providerIds.apple" in keyPattern || "providerIds.apple" in keyValue) {
    throw new ConflictException("Apple account is already linked");
  }

  if ("providerIds.google" in keyPattern || "providerIds.google" in keyValue) {
    throw new ConflictException("Google account is already linked");
  }

  if (
    "providerIds.facebook" in keyPattern ||
    "providerIds.facebook" in keyValue
  ) {
    throw new ConflictException("Facebook account is already linked");
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
