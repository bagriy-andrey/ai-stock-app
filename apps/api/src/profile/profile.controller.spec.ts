import type { UserDto } from "@ai-stock-advisor/shared";
import type { UsersService } from "../users/users.service";
import type { ProfileAvatarStorageService } from "./profile-avatar-storage.service";
import { ProfileController } from "./profile.controller";

describe("ProfileController", () => {
  const user: UserDto = {
    id: "user-id",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "/uploads/avatars/old.png",
    authProviders: {
      google: true,
      email: false,
      apple: false,
      facebook: false,
      phone: false,
    },
    twoFactorEnabled: false,
    language: "en",
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  };
  const usersService = {
    findById: jest.fn(),
    updateProfile: jest.fn(),
    updateAvatar: jest.fn(),
  } as jest.Mocked<
    Pick<UsersService, "findById" | "updateProfile" | "updateAvatar">
  >;
  const avatarStorage = {
    save: jest.fn(),
    remove: jest.fn(),
  } as jest.Mocked<Pick<ProfileAvatarStorageService, "save" | "remove">>;
  const controller = new ProfileController(
    usersService as unknown as UsersService,
    avatarStorage as unknown as ProfileAvatarStorageService,
  );
  const request = {
    headers: {},
    user: {
      sub: user.id,
      email: user.email,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets and updates only the authenticated user's profile", async () => {
    usersService.findById.mockResolvedValue(user);
    usersService.updateProfile.mockResolvedValue(user);

    await expect(controller.getProfile(request)).resolves.toEqual(user);
    await expect(
      controller.updateProfile(request, { language: "uk" }),
    ).resolves.toEqual(user);

    expect(usersService.findById).toHaveBeenCalledWith(user.id);
    expect(usersService.updateProfile).toHaveBeenCalledWith(user.id, {
      language: "uk",
    });
  });

  it("stores a new avatar and removes the previous local avatar", async () => {
    const avatarUrl = "/uploads/avatars/new.png";
    const file = {
      buffer: Buffer.from("avatar"),
      mimetype: "image/png",
      size: 6,
    };
    usersService.findById.mockResolvedValue(user);
    avatarStorage.save.mockResolvedValue(avatarUrl);
    usersService.updateAvatar.mockResolvedValue({ ...user, avatarUrl });

    await expect(controller.uploadAvatar(request, file)).resolves.toEqual({
      ...user,
      avatarUrl,
    });

    expect(usersService.updateAvatar).toHaveBeenCalledWith(user.id, avatarUrl);
    expect(avatarStorage.remove).toHaveBeenCalledWith(user.avatarUrl);
  });

  it("clears the stored avatar before removing the previous local file", async () => {
    usersService.findById.mockResolvedValue(user);
    usersService.updateAvatar.mockResolvedValue({ ...user, avatarUrl: undefined });

    await expect(controller.deleteAvatar(request)).resolves.toEqual({
      ...user,
      avatarUrl: undefined,
    });

    expect(usersService.updateAvatar).toHaveBeenCalledWith(user.id);
    expect(avatarStorage.remove).toHaveBeenCalledWith(user.avatarUrl);
  });
});
