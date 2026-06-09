import type { UserDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { UsersController } from "./users.controller";
import type { UsersService } from "./users.service";

describe("UsersController", () => {
  const usersService = {
    findById: jest.fn(),
  } as jest.Mocked<Pick<UsersService, "findById">>;
  const controller = new UsersController(usersService as unknown as UsersService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the authenticated user", async () => {
    const user: UserDto = {
      id: "user-id",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      authProviders: {
        google: true,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      twoFactorEnabled: false,
      language: "en",
      telegramChatId: "123456789",
      createdAt: "2026-06-02T09:00:00.000Z",
      updatedAt: "2026-06-02T09:00:00.000Z",
    };
    usersService.findById.mockResolvedValue(user);

    await expect(
      controller.getCurrentUser({
        headers: {},
        user: {
          sub: user.id,
          email: user.email,
        },
      }),
    ).resolves.toEqual(user);

    expect(usersService.findById).toHaveBeenCalledWith(user.id);
  });

  it("rejects requests without an authenticated user payload", () => {
    const request: AuthenticatedRequest = {
      headers: {},
    };

    expect(() => controller.getCurrentUser(request)).toThrow(
      "Authenticated request is missing user payload",
    );
  });
});
