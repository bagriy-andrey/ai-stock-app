import { loginWithEmail, loginWithProvider } from "./auth-api";

describe("auth-api", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("calls the email/nickname login endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            email: "user@example.com",
            nickname: "andrey",
            authProviders: {
              google: false,
              email: true,
              apple: false,
              facebook: false,
              phone: false,
            },
            twoFactorEnabled: false,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      loginWithEmail({
        identifier: "andrey",
        password: "StrongPassword123",
      }),
    ).resolves.toMatchObject({
      accessToken: "app-jwt",
      user: {
        id: "user-id",
        email: "user@example.com",
        nickname: "andrey",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "andrey",
          password: "StrongPassword123",
        }),
      }),
    );
  });

  it("routes email provider login through the shared provider helper", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            email: "user@example.com",
            authProviders: {
              google: false,
              email: true,
              apple: false,
              facebook: false,
              phone: false,
            },
            twoFactorEnabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      loginWithProvider("email", {
        identifier: "user@example.com",
        password: "StrongPassword123",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/login",
      expect.any(Object),
    );
  });

  it("surfaces invalid credential responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      loginWithEmail({
        identifier: "missing",
        password: "wrong-password",
      }),
    ).rejects.toThrow("Invalid credentials");
  });
});
