import { UnauthorizedException } from "@nestjs/common";
import { FacebookAuthService } from "./facebook-auth.service";

describe("FacebookAuthService", () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.FACEBOOK_APP_ID = "facebook-app-id";
    process.env.FACEBOOK_APP_SECRET = "facebook-app-secret";
    jest.useFakeTimers().setSystemTime(new Date("2026-06-02T09:00:00.000Z"));
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  it("verifies a valid token and fetches the Facebook profile", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              app_id: "facebook-app-id",
              is_valid: true,
              user_id: "facebook-user-id",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "facebook-user-id",
            email: "USER@example.com",
            first_name: " Facebook ",
            last_name: " User ",
            picture: {
              data: {
                url: "https://example.com/facebook.jpg",
              },
            },
          }),
          { status: 200 },
        ),
      );

    await expect(
      new FacebookAuthService().verifyAccessToken("facebook-access-token"),
    ).resolves.toEqual({
      providerId: "facebook-user-id",
      email: "user@example.com",
      firstName: "Facebook",
      lastName: "User",
      avatarUrl: "https://example.com/facebook.jpg",
      emailVerified: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("debug_token");
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "input_token=facebook-access-token",
    );
  });

  it("rejects an invalid token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { is_valid: false } }), { status: 200 }),
    );

    await expect(
      new FacebookAuthService().verifyAccessToken("invalid-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token issued for another app", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            app_id: "other-app-id",
            is_valid: true,
            user_id: "facebook-user-id",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      new FacebookAuthService().verifyAccessToken("wrong-app-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an expired token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            app_id: "facebook-app-id",
            is_valid: true,
            user_id: "facebook-user-id",
            expires_at: Math.floor(Date.now() / 1000) - 1,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      new FacebookAuthService().verifyAccessToken("expired-token"),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects profile responses for a different Facebook user id", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              app_id: "facebook-app-id",
              is_valid: true,
              user_id: "facebook-user-id",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "different-facebook-user-id" }), {
          status: 200,
        }),
      );

    await expect(
      new FacebookAuthService().verifyAccessToken("mismatched-token"),
    ).rejects.toThrow(UnauthorizedException);
  });
});
