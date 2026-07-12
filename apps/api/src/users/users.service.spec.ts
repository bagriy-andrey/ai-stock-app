import { ConflictException, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { UsersService } from "./users.service";
import type { UserDocument } from "./schemas/user.schema";

describe("UsersService", () => {
  const userModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };
  const service = new UsersService(userModel as never);
  const userId = new Types.ObjectId("665daec06c456275631b7af1");
  const now = new Date("2026-06-02T09:00:00.000Z");
  const userDocument = {
    _id: userId,
    email: "test@example.com",
    name: "Test User",
    firstName: "Test",
    lastName: "User",
    nickname: "Tester",
    avatarUrl: "https://example.com/avatar.png",
    authProviders: {
      google: true,
      email: false,
      apple: false,
      facebook: false,
      phone: false,
    },
    providerIds: {
      google: "google-user-id",
    },
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    language: "en",
    theme: "dark",
    watchlistViewMode: "list",
    telegramChatId: "123456789",
    createdAt: now,
    updatedAt: now,
  } as unknown as UserDocument;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates or updates Google users by normalized email", async () => {
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(null);
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.findOneAndUpdate.mockReturnValue({ exec });

    await expect(
      service.findOrCreateFromGoogle({
        email: "TEST@example.com",
        providerId: "google-user-id",
        name: "Test User",
        firstName: "Test",
        lastName: "User",
        avatarUrl: "https://example.com/avatar.png",
        emailVerified: true,
      }),
    ).resolves.toEqual({
      id: userId.toString(),
      email: userDocument.email,
      emailVerified: true,
      name: userDocument.name,
      firstName: userDocument.firstName,
      lastName: userDocument.lastName,
      nickname: userDocument.nickname,
      phoneNumber: undefined,
      phoneVerified: false,
      avatarUrl: userDocument.avatarUrl,
      authProviders: userDocument.authProviders,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: userDocument.language,
      theme: userDocument.theme,
      watchlistViewMode: userDocument.watchlistViewMode,
      telegramChatId: userDocument.telegramChatId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      "providerIds.google": "google-user-id",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      email: "test@example.com",
    });
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { email: "test@example.com" },
      {
        $set: {
          email: "test@example.com",
          name: "Test User",
          firstName: "Test",
          lastName: "User",
          avatarUrl: "https://example.com/avatar.png",
          emailVerified: true,
          "authProviders.google": true,
          "providerIds.google": "google-user-id",
        },
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
    );
  });

  it("reuses an existing Google user by provider id", async () => {
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(userDocument);
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.findOneAndUpdate.mockReturnValue({ exec });

    await service.findOrCreateFromGoogle({
      email: "test@example.com",
      providerId: "google-user-id",
      name: "Test User",
      emailVerified: true,
    });

    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userDocument._id },
      expect.any(Object),
      expect.objectContaining({ upsert: true }),
    );
  });

  it("logs in an existing Apple user by provider id without overwriting names with empty values", async () => {
    const selectProvider = jest.fn().mockReturnThis();
    const providerExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(userDocument);
    const updateExec = jest
      .fn<Promise<UserDocument>, []>()
      .mockResolvedValue({
        ...userDocument,
        authProviders: {
          ...userDocument.authProviders,
          apple: true,
        },
      } as UserDocument);
    userModel.findOne.mockReturnValueOnce({
      select: selectProvider,
      exec: providerExec,
    });
    userModel.findOneAndUpdate.mockReturnValue({ exec: updateExec });

    await service.findOrCreateFromApple({
      providerId: "apple-user-id",
      email: "test@example.com",
      firstName: "",
      lastName: "",
      emailVerified: true,
    });

    expect(userModel.findOne).toHaveBeenCalledWith({
      "providerIds.apple": "apple-user-id",
    });
    expect(selectProvider).toHaveBeenCalledWith("+providerIds");
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userDocument._id },
      {
        $set: {
          emailVerified: true,
          "authProviders.apple": true,
          "providerIds.apple": "apple-user-id",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  it("links an existing user by verified Apple email", async () => {
    const providerSelect = jest.fn().mockReturnThis();
    const emailSelect = jest.fn().mockReturnThis();
    const updateExec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue({
      ...userDocument,
      authProviders: {
        ...userDocument.authProviders,
        apple: true,
      },
    } as UserDocument);
    userModel.findOne
      .mockReturnValueOnce({
        select: providerSelect,
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        select: emailSelect,
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue({
          ...userDocument,
          providerIds: {},
        } as UserDocument),
      });
    userModel.findOneAndUpdate.mockReturnValue({ exec: updateExec });

    await service.findOrCreateFromApple({
      providerId: "apple-user-id",
      email: "TEST@example.com",
      firstName: "Apple",
      lastName: "User",
      emailVerified: true,
    });

    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      "providerIds.apple": "apple-user-id",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      email: "test@example.com",
    });
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userDocument._id },
      {
        $set: {
          emailVerified: true,
          "authProviders.apple": true,
          "providerIds.apple": "apple-user-id",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  it("creates a new Apple user without requiring an email", async () => {
    const providerSelect = jest.fn().mockReturnThis();
    const appleUserDocument = {
      ...userDocument,
      email: undefined,
      name: undefined,
      firstName: undefined,
      lastName: undefined,
      nickname: undefined,
      authProviders: {
        google: false,
        email: false,
        apple: true,
        facebook: false,
        phone: false,
      },
      providerIds: {
        apple: "apple-user-id",
      },
      emailVerified: false,
    } as unknown as UserDocument;
    userModel.findOne.mockReturnValueOnce({
      select: providerSelect,
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    userModel.create.mockResolvedValue(appleUserDocument);

    await expect(
      service.findOrCreateFromApple({
        providerId: "apple-user-id",
        emailVerified: false,
      }),
    ).resolves.toMatchObject({
      id: userId.toString(),
      email: undefined,
      name: "User",
      authProviders: expect.objectContaining({ apple: true }),
    });
    expect(userModel.create).toHaveBeenCalledWith({
      emailVerified: false,
      authProviders: {
        google: false,
        email: false,
        apple: true,
        facebook: false,
        phone: false,
      },
      providerIds: {
        apple: "apple-user-id",
      },
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      watchlistViewMode: "grid",
    });
  });

  it("rejects linking an email user already linked to another Apple provider id", async () => {
    userModel.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue({
          ...userDocument,
          providerIds: {
            apple: "other-apple-user-id",
          },
        } as UserDocument),
      });

    await expect(
      service.findOrCreateFromApple({
        providerId: "apple-user-id",
        email: "test@example.com",
        emailVerified: true,
      }),
    ).rejects.toThrow("Apple account is already linked");
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("logs in an existing Facebook user by provider id without overwriting profile fields", async () => {
    const selectProvider = jest.fn().mockReturnThis();
    const providerExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(userDocument);
    const updateExec = jest
      .fn<Promise<UserDocument>, []>()
      .mockResolvedValue({
        ...userDocument,
        authProviders: {
          ...userDocument.authProviders,
          facebook: true,
        },
        providerIds: {
          ...userDocument.providerIds,
          facebook: "facebook-user-id",
        },
      } as UserDocument);
    userModel.findOne.mockReturnValueOnce({
      select: selectProvider,
      exec: providerExec,
    });
    userModel.findOneAndUpdate.mockReturnValue({ exec: updateExec });

    await service.findOrCreateFromFacebook({
      providerId: "facebook-user-id",
      email: "test@example.com",
      firstName: "",
      lastName: "",
      avatarUrl: "",
      emailVerified: false,
    });

    expect(userModel.findOne).toHaveBeenCalledWith({
      "providerIds.facebook": "facebook-user-id",
    });
    expect(selectProvider).toHaveBeenCalledWith("+providerIds");
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userDocument._id },
      {
        $set: {
          "authProviders.facebook": true,
          "providerIds.facebook": "facebook-user-id",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  it("links an existing user by Facebook email", async () => {
    const providerSelect = jest.fn().mockReturnThis();
    const emailSelect = jest.fn().mockReturnThis();
    const updateExec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue({
      ...userDocument,
      authProviders: {
        ...userDocument.authProviders,
        facebook: true,
      },
    } as UserDocument);
    userModel.findOne
      .mockReturnValueOnce({
        select: providerSelect,
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        select: emailSelect,
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue({
          ...userDocument,
          providerIds: {},
        } as UserDocument),
      });
    userModel.findOneAndUpdate.mockReturnValue({ exec: updateExec });

    await service.findOrCreateFromFacebook({
      providerId: "facebook-user-id",
      email: "TEST@example.com",
      firstName: "Facebook",
      lastName: "User",
      avatarUrl: "https://example.com/facebook.jpg",
      emailVerified: false,
    });

    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      "providerIds.facebook": "facebook-user-id",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      email: "test@example.com",
    });
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userDocument._id },
      {
        $set: {
          "authProviders.facebook": true,
          "providerIds.facebook": "facebook-user-id",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  it("creates a new Facebook user without requiring an email", async () => {
    const providerSelect = jest.fn().mockReturnThis();
    const facebookUserDocument = {
      ...userDocument,
      email: undefined,
      name: "Facebook User",
      firstName: "Facebook",
      lastName: "User",
      nickname: undefined,
      avatarUrl: "https://example.com/facebook.jpg",
      authProviders: {
        google: false,
        email: false,
        apple: false,
        facebook: true,
        phone: false,
      },
      providerIds: {
        facebook: "facebook-user-id",
      },
      emailVerified: false,
    } as unknown as UserDocument;
    userModel.findOne.mockReturnValueOnce({
      select: providerSelect,
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    userModel.create.mockResolvedValue(facebookUserDocument);

    await expect(
      service.findOrCreateFromFacebook({
        providerId: "facebook-user-id",
        firstName: "Facebook",
        lastName: "User",
        avatarUrl: "https://example.com/facebook.jpg",
        emailVerified: false,
      }),
    ).resolves.toMatchObject({
      id: userId.toString(),
      email: undefined,
      authProviders: expect.objectContaining({ facebook: true }),
    });
    expect(userModel.create).toHaveBeenCalledWith({
      name: "Facebook User",
      firstName: "Facebook",
      lastName: "User",
      avatarUrl: "https://example.com/facebook.jpg",
      emailVerified: false,
      authProviders: {
        google: false,
        email: false,
        apple: false,
        facebook: true,
        phone: false,
      },
      providerIds: {
        facebook: "facebook-user-id",
      },
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      watchlistViewMode: "grid",
    });
  });

  it("rejects linking an email user already linked to another Facebook provider id", async () => {
    userModel.findOne
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue({
          ...userDocument,
          providerIds: {
            facebook: "other-facebook-user-id",
          },
        } as UserDocument),
      });

    await expect(
      service.findOrCreateFromFacebook({
        providerId: "facebook-user-id",
        email: "test@example.com",
        emailVerified: false,
      }),
    ).rejects.toThrow("Facebook account is already linked");
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("finds a user by id", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).resolves.toEqual({
      id: userId.toString(),
      email: userDocument.email,
      emailVerified: true,
      name: userDocument.name,
      firstName: userDocument.firstName,
      lastName: userDocument.lastName,
      nickname: userDocument.nickname,
      phoneNumber: undefined,
      phoneVerified: false,
      avatarUrl: userDocument.avatarUrl,
      authProviders: userDocument.authProviders,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: userDocument.language,
      theme: userDocument.theme,
      watchlistViewMode: userDocument.watchlistViewMode,
      telegramChatId: userDocument.telegramChatId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("finds password reset users with password hash selected", async () => {
    const select = jest.fn().mockReturnThis();
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue({
      ...userDocument,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      passwordHash: "scrypt:salt:hash",
    } as unknown as UserDocument);
    userModel.findOne.mockReturnValue({ select, exec });

    await expect(
      service.findByEmailForPasswordReset(" USER@example.com "),
    ).resolves.toEqual({
      id: userId.toString(),
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      passwordHash: "scrypt:salt:hash",
    });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: "user@example.com" });
    expect(select).toHaveBeenCalledWith("+passwordHash");
  });

  it("stores password reset token hash and expiration", async () => {
    const exec = jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null);
    const expiresAt = new Date("2026-06-02T09:30:00.000Z");
    userModel.findByIdAndUpdate.mockReturnValue({ exec });

    await service.storePasswordResetTokenHash(
      userId.toString(),
      "hashed-token",
      expiresAt,
    );

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(userId.toString(), {
      $set: {
        passwordResetTokenHash: "hashed-token",
        passwordResetExpiresAt: expiresAt,
      },
    });
  });

  it("resets password by a non-expired token hash and clears reset fields", async () => {
    const exec = jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue({
      ...userDocument,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
    } as unknown as UserDocument);
    userModel.findOneAndUpdate.mockReturnValue({ exec });

    await expect(
      service.resetPasswordByTokenHash(
        "hashed-token",
        "scrypt:new-salt:new-hash",
        now,
      ),
    ).resolves.toBe(true);

    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        passwordResetTokenHash: "hashed-token",
        passwordResetExpiresAt: { $gt: now },
      },
      {
        $set: {
          passwordHash: "scrypt:new-salt:new-hash",
          "authProviders.email": true,
        },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
        },
      },
      { new: true },
    );
  });

  it("returns false when resetting with an expired, invalid, or reused token", async () => {
    const exec = jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null);
    userModel.findOneAndUpdate.mockReturnValue({ exec });

    await expect(
      service.resetPasswordByTokenHash(
        "missing-hashed-token",
        "scrypt:new-salt:new-hash",
        now,
      ),
    ).resolves.toBe(false);
  });

  it("creates an email user with email auth enabled", async () => {
    const emailUserDocument = {
      ...userDocument,
      email: "user@example.com",
      name: undefined,
      nickname: "andrey",
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      watchlistViewMode: "grid",
    } as unknown as UserDocument;
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(null);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.create.mockResolvedValue(emailUserDocument);

    await expect(
      service.createWithEmail({
        email: " USER@example.com ",
        nickname: " Andrey ",
        passwordHash: "scrypt:salt:hash",
      }),
    ).resolves.toMatchObject({
      email: "user@example.com",
      nickname: "andrey",
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
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      email: "user@example.com",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      nickname: "andrey",
    });
    expect(userModel.create).toHaveBeenCalledWith({
      email: "user@example.com",
      nickname: "andrey",
      passwordHash: "scrypt:salt:hash",
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
    expect(userModel.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ password: expect.any(String) }),
    );
  });

  it("creates an email user with a normalized unique phone number", async () => {
    const emailUserDocument = {
      ...userDocument,
      email: "user@example.com",
      name: undefined,
      nickname: "andrey",
      phoneNumber: "+48500111222",
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: true,
      },
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      watchlistViewMode: "grid",
    } as unknown as UserDocument;
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(null);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.create.mockResolvedValue(emailUserDocument);

    await expect(
      service.createWithEmail({
        email: "user@example.com",
        nickname: "andrey",
        phoneNumber: "+48 500 111 222",
        passwordHash: "scrypt:salt:hash",
      }),
    ).resolves.toMatchObject({
      phoneNumber: "+48500111222",
      phoneVerified: false,
      authProviders: expect.objectContaining({ phone: true }),
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(3, {
      phoneNumber: "+48500111222",
    });
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: "+48500111222",
        authProviders: expect.objectContaining({ phone: true }),
      }),
    );
  });

  it("finds login credentials by normalized email", async () => {
    const emailUserDocument = {
      ...userDocument,
      email: "user@example.com",
      nickname: "andrey",
      passwordHash: "$2b$12$password-hash",
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
    } as unknown as UserDocument;
    const select = jest.fn().mockReturnValue({
      exec: jest
        .fn<Promise<UserDocument | null>, []>()
        .mockResolvedValue(emailUserDocument),
    });
    userModel.findOne.mockReturnValue({ select });

    await expect(
      service.findByEmailOrNicknameForLogin(" USER@example.com "),
    ).resolves.toMatchObject({
      email: "user@example.com",
      nickname: "andrey",
      passwordHash: "$2b$12$password-hash",
    });
    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({
      email: "user@example.com",
    });
    expect(select).toHaveBeenCalledWith("+passwordHash");
  });

  it("falls back to normalized nickname when login email lookup misses", async () => {
    const emailSelect = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    const nicknameSelect = jest.fn().mockReturnValue({
      exec: jest
        .fn<Promise<UserDocument | null>, []>()
        .mockResolvedValue({
          ...userDocument,
          email: "user@example.com",
          nickname: "andrey",
          passwordHash: "$2b$12$password-hash",
        } as unknown as UserDocument),
    });
    userModel.findOne
      .mockReturnValueOnce({ select: emailSelect })
      .mockReturnValueOnce({ select: nicknameSelect });

    await expect(
      service.findByEmailOrNicknameForLogin(" Andrey "),
    ).resolves.toMatchObject({
      email: "user@example.com",
      nickname: "andrey",
      passwordHash: "$2b$12$password-hash",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      email: "andrey",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      nickname: "andrey",
    });
    expect(emailSelect).toHaveBeenCalledWith("+passwordHash");
    expect(nicknameSelect).toHaveBeenCalledWith("+passwordHash");
  });

  it("looks up login credentials by normalized phone before email or nickname", async () => {
    const phoneSelect = jest.fn().mockReturnValue({
      exec: jest
        .fn<Promise<UserDocument | null>, []>()
        .mockResolvedValue({
          ...userDocument,
          email: "user@example.com",
          nickname: "andrey",
          phoneNumber: "+380671234567",
          passwordHash: "$2b$12$password-hash",
          authProviders: {
            google: false,
            email: true,
            apple: false,
            facebook: false,
            phone: true,
          },
        } as unknown as UserDocument),
    });
    userModel.findOne.mockReturnValue({ select: phoneSelect });

    await expect(
      service.findByEmailOrNicknameForLogin("+380 67 123 45 67"),
    ).resolves.toMatchObject({
      phoneNumber: "+380671234567",
      passwordHash: "$2b$12$password-hash",
    });
    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({
      phoneNumber: "+380671234567",
    });
    expect(phoneSelect).toHaveBeenCalledWith("+passwordHash");
  });

  it("looks up login credentials by phone with access code and extension", async () => {
    const phoneSelect = jest.fn().mockReturnValue({
      exec: jest
        .fn<Promise<UserDocument | null>, []>()
        .mockResolvedValue({
          ...userDocument,
          email: "user@example.com",
          nickname: "andrey",
          phoneNumber: "+48500111222",
          passwordHash: "$2b$12$password-hash",
          authProviders: {
            google: false,
            email: true,
            apple: false,
            facebook: false,
            phone: true,
          },
        } as unknown as UserDocument),
    });
    userModel.findOne.mockReturnValue({ select: phoneSelect });

    await expect(
      service.findByEmailOrNicknameForLogin("0048 500 111 222 x9"),
    ).resolves.toMatchObject({
      phoneNumber: "+48500111222",
      passwordHash: "$2b$12$password-hash",
    });
    expect(userModel.findOne).toHaveBeenCalledTimes(1);
    expect(userModel.findOne).toHaveBeenCalledWith({
      phoneNumber: "+48500111222",
    });
    expect(phoneSelect).toHaveBeenCalledWith("+passwordHash");
  });

  it("returns null when login email and nickname lookups miss", async () => {
    const select = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    userModel.findOne.mockReturnValue({ select });

    await expect(
      service.findByEmailOrNicknameForLogin("missing"),
    ).resolves.toBeNull();
    expect(userModel.findOne).toHaveBeenNthCalledWith(1, {
      email: "missing",
    });
    expect(userModel.findOne).toHaveBeenNthCalledWith(2, {
      nickname: "missing",
    });
  });

  it("rejects duplicate email during email registration pre-check", async () => {
    userModel.findOne.mockReturnValueOnce({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(userDocument),
    });

    await expect(
      service.createWithEmail({
        email: "test@example.com",
        nickname: "andrey",
        passwordHash: "scrypt:salt:hash",
      }),
    ).rejects.toThrow("Email already exists");
  });

  it("rejects duplicate nickname during email registration pre-check", async () => {
    userModel.findOne
      .mockReturnValueOnce({
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(userDocument),
      });

    await expect(
      service.createWithEmail({
        email: "user@example.com",
        nickname: "tester",
        passwordHash: "scrypt:salt:hash",
      }),
    ).rejects.toThrow("Nickname already exists");
  });

  it("rejects duplicate phone numbers during email registration pre-check", async () => {
    userModel.findOne
      .mockReturnValueOnce({
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
      })
      .mockReturnValueOnce({
        exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(userDocument),
      });

    await expect(
      service.createWithEmail({
        email: "user@example.com",
        nickname: "tester",
        phoneNumber: "+48500111222",
        passwordHash: "scrypt:salt:hash",
      }),
    ).rejects.toThrow("Phone number already exists");
  });

  it("maps duplicate key errors from MongoDB to conflict messages", async () => {
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(null);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.create.mockRejectedValue({
      code: 11000,
      keyPattern: { nickname: 1 },
    });

    await expect(
      service.createWithEmail({
        email: "user@example.com",
        nickname: "tester",
        passwordHash: "scrypt:salt:hash",
      }),
    ).rejects.toThrow("Nickname already exists");
  });

  it("maps duplicate phone key errors from MongoDB to conflict messages", async () => {
    const findOneExec = jest
      .fn<Promise<UserDocument | null>, []>()
      .mockResolvedValue(null);
    userModel.findOne.mockReturnValue({ exec: findOneExec });
    userModel.create.mockRejectedValue({
      code: 11000,
      keyPattern: { phoneNumber: 1 },
    });

    await expect(
      service.createWithEmail({
        email: "user@example.com",
        nickname: "tester",
        phoneNumber: "+48500111222",
        passwordHash: "scrypt:salt:hash",
      }),
    ).rejects.toThrow("Phone number already exists");
  });

  it("falls back to English when a stored language is invalid", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue({
      ...userDocument,
      language: "de",
    } as unknown as UserDocument);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).resolves.toMatchObject({
      language: "en",
    });
  });

  it("keeps legacy Google documents valid when new auth fields are missing", async () => {
    const legacyUser = {
      _id: userId,
      email: "legacy@example.com",
      name: "Legacy User",
      firstName: "Legacy",
      lastName: "User",
      createdAt: now,
      updatedAt: now,
    } as unknown as UserDocument;
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(legacyUser);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).resolves.toEqual({
      id: userId.toString(),
      email: "legacy@example.com",
      emailVerified: false,
      name: "Legacy User",
      firstName: "Legacy",
      lastName: "User",
      nickname: undefined,
      phoneNumber: undefined,
      phoneVerified: false,
      avatarUrl: undefined,
      authProviders: {
        google: false,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      theme: undefined,
      watchlistViewMode: "grid",
      telegramChatId: undefined,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("rejects invalid user ids", async () => {
    await expect(service.findById("not-an-object-id")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("updates editable profile fields and clears empty optional text", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findByIdAndUpdate.mockReturnValue({ exec });

    await expect(
      service.updateProfile(userId.toString(), {
        firstName: "Updated",
        lastName: null,
        language: "uk",
        theme: "system",
        watchlistViewMode: "grid",
      }),
    ).resolves.toMatchObject({
      id: userId.toString(),
      language: "en",
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId.toString(),
      {
        $set: {
          firstName: "Updated",
          language: "uk",
          theme: "system",
          watchlistViewMode: "grid",
        },
        $unset: {
          lastName: 1,
        },
      },
      { new: true, runValidators: true },
    );
  });

  it("updates profile phone number and marks it unverified", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue({
      ...userDocument,
      phoneNumber: "+48500111222",
      phoneVerified: false,
      authProviders: {
        ...userDocument.authProviders,
        phone: true,
      },
    } as unknown as UserDocument);
    userModel.findByIdAndUpdate.mockReturnValue({ exec });

    await expect(
      service.updateProfile(userId.toString(), {
        phoneNumber: "+48500111222",
      }),
    ).resolves.toMatchObject({
      phoneNumber: "+48500111222",
      phoneVerified: false,
      authProviders: expect.objectContaining({ phone: true }),
    });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      userId.toString(),
      {
        $set: {
          phoneNumber: "+48500111222",
          phoneVerified: false,
          "authProviders.phone": true,
        },
      },
      { new: true, runValidators: true },
    );
  });

  it("updates and removes an avatar", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findByIdAndUpdate.mockReturnValue({ exec });

    await service.updateAvatar(userId.toString(), "/uploads/avatars/avatar.png");
    expect(userModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      userId.toString(),
      { $set: { avatarUrl: "/uploads/avatars/avatar.png" } },
      { new: true },
    );

    await service.updateAvatar(userId.toString());
    expect(userModel.findByIdAndUpdate).toHaveBeenLastCalledWith(
      userId.toString(),
      { $unset: { avatarUrl: 1 } },
      { new: true },
    );
  });

  it("links Google to the current user and stores provider id internally", async () => {
    const currentUser = {
      ...userDocument,
      authProviders: {
        google: false,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      providerIds: {},
    } as unknown as UserDocument;
    const updatedUser = {
      ...currentUser,
      authProviders: {
        google: true,
        email: true,
        apple: false,
        facebook: false,
        phone: false,
      },
      providerIds: {
        google: "google-user-id",
      },
    } as unknown as UserDocument;
    const selectCurrent = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(currentUser),
    });
    const selectProvider = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    const selectEmail = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(currentUser),
    });
    const execUpdate = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(
      updatedUser,
    );
    userModel.findById.mockReturnValue({ select: selectCurrent });
    userModel.findOne
      .mockReturnValueOnce({ select: selectProvider })
      .mockReturnValueOnce({ select: selectEmail });
    userModel.findOneAndUpdate.mockReturnValue({ exec: execUpdate });

    await expect(
      service.linkGoogleProvider(userId.toString(), {
        email: "TEST@example.com",
        providerId: "google-user-id",
        name: "Google Name",
        firstName: "Google",
        lastName: "User",
        avatarUrl: "https://example.com/google.png",
        emailVerified: true,
      }),
    ).resolves.toMatchObject({
      authProviders: expect.objectContaining({ google: true }),
    });

    expect(selectCurrent).toHaveBeenCalledWith("+providerIds");
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: userId },
      {
        $set: {
          emailVerified: true,
          "authProviders.google": true,
          "providerIds.google": "google-user-id",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
  });

  it("links the same Apple provider to the same user idempotently", async () => {
    const currentUser = {
      ...userDocument,
      authProviders: {
        google: false,
        email: true,
        apple: true,
        facebook: false,
        phone: false,
      },
      providerIds: {
        apple: "apple-user-id",
      },
    } as unknown as UserDocument;
    const selectCurrent = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(currentUser),
    });
    const selectProvider = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(currentUser),
    });
    const selectEmail = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(currentUser),
    });
    userModel.findById.mockReturnValue({ select: selectCurrent });
    userModel.findOne
      .mockReturnValueOnce({ select: selectProvider })
      .mockReturnValueOnce({ select: selectEmail });
    userModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(currentUser),
    });

    await expect(
      service.linkAppleProvider(userId.toString(), {
        providerId: "apple-user-id",
        email: "test@example.com",
        emailVerified: true,
      }),
    ).resolves.toMatchObject({
      authProviders: expect.objectContaining({ apple: true }),
    });
  });

  it("rejects provider ids already linked to another user", async () => {
    const otherUser = {
      ...userDocument,
      _id: new Types.ObjectId("665daec06c456275631b7af2"),
      providerIds: {
        facebook: "facebook-user-id",
      },
    } as unknown as UserDocument;
    const selectCurrent = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument),
    });
    const selectProvider = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(otherUser),
    });
    userModel.findById.mockReturnValue({ select: selectCurrent });
    userModel.findOne.mockReturnValue({ select: selectProvider });

    await expect(
      service.linkFacebookProvider(userId.toString(), {
        providerId: "facebook-user-id",
        emailVerified: false,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects verified provider emails that belong to another user", async () => {
    const otherUser = {
      ...userDocument,
      _id: new Types.ObjectId("665daec06c456275631b7af2"),
      email: "other@example.com",
    } as unknown as UserDocument;
    const selectCurrent = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument),
    });
    const selectProvider = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null),
    });
    const selectEmail = jest.fn().mockReturnValue({
      exec: jest.fn<Promise<UserDocument>, []>().mockResolvedValue(otherUser),
    });
    userModel.findById.mockReturnValue({ select: selectCurrent });
    userModel.findOne
      .mockReturnValueOnce({ select: selectProvider })
      .mockReturnValueOnce({ select: selectEmail });

    await expect(
      service.linkAppleProvider(userId.toString(), {
        providerId: "apple-user-id",
        email: "other@example.com",
        emailVerified: true,
      }),
    ).rejects.toThrow(
      "This provider email is already associated with another account.",
    );
  });

  it("rejects missing users", async () => {
    const exec = jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).rejects.toThrow(
      NotFoundException,
    );
  });
});
