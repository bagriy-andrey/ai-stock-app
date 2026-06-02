import { NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { UsersService } from "./users.service";
import type { UserDocument } from "./schemas/user.schema";

describe("UsersService", () => {
  const userModel = {
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
  };
  const service = new UsersService(userModel as never);
  const userId = new Types.ObjectId("665daec06c456275631b7af1");
  const now = new Date("2026-06-02T09:00:00.000Z");
  const userDocument = {
    _id: userId,
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.png",
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
      avatarUrl: userDocument.avatarUrl,
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
          avatarUrl: "https://example.com/avatar.png",
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
      avatarUrl: userDocument.avatarUrl,
      telegramChatId: userDocument.telegramChatId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("rejects invalid user ids", async () => {
    await expect(service.findById("not-an-object-id")).rejects.toThrow(
      NotFoundException,
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
