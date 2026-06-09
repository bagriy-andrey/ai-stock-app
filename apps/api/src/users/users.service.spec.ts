import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { UsersService } from "./users.service";
import type { UserDocument } from "./schemas/user.schema";

describe("UsersService", () => {
  const userModel = {
    findOneAndUpdate: jest.fn(),
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
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findOneAndUpdate.mockReturnValue({ exec });

    await expect(
      service.findOrCreateFromGoogle({
        email: "TEST@example.com",
        name: "Test User",
        avatarUrl: "https://example.com/avatar.png",
      }),
    ).resolves.toEqual({
      id: userId.toString(),
      email: userDocument.email,
      name: userDocument.name,
      firstName: userDocument.firstName,
      lastName: userDocument.lastName,
      nickname: userDocument.nickname,
      avatarUrl: userDocument.avatarUrl,
      language: userDocument.language,
      theme: userDocument.theme,
      watchlistViewMode: userDocument.watchlistViewMode,
      telegramChatId: userDocument.telegramChatId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      { email: "test@example.com" },
      {
        $set: {
          email: "test@example.com",
          name: "Test User",
        },
        $setOnInsert: {
          avatarUrl: "https://example.com/avatar.png",
          language: "en",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  });

  it("finds a user by id", async () => {
    const exec = jest.fn<Promise<UserDocument>, []>().mockResolvedValue(userDocument);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).resolves.toEqual({
      id: userId.toString(),
      email: userDocument.email,
      name: userDocument.name,
      firstName: userDocument.firstName,
      lastName: userDocument.lastName,
      nickname: userDocument.nickname,
      avatarUrl: userDocument.avatarUrl,
      language: userDocument.language,
      theme: userDocument.theme,
      watchlistViewMode: userDocument.watchlistViewMode,
      telegramChatId: userDocument.telegramChatId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
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

  it("rejects missing users", async () => {
    const exec = jest.fn<Promise<UserDocument | null>, []>().mockResolvedValue(null);
    userModel.findById.mockReturnValue({ exec });

    await expect(service.findById(userId.toString())).rejects.toThrow(
      NotFoundException,
    );
  });
});
