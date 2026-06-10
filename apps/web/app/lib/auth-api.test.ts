import {
  forgotPassword,
  loginWithEmail,
  loginWithPhone,
  loginWithProvider,
} from "./auth-api";

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

  it("routes phone password login through the shared login endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            email: "user@example.com",
            phoneNumber: "+48500111222",
            phoneVerified: false,
            authProviders: {
              google: false,
              email: true,
              apple: false,
              facebook: false,
              phone: true,
            },
            twoFactorEnabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      loginWithPhone({
        identifier: "+48 500 111 222",
        password: "StrongPassword123",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identifier: "+48 500 111 222",
          password: "StrongPassword123",
        }),
      }),
    );
  });

  it("routes phone provider login through the shared provider helper", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            phoneNumber: "+48500111222",
            phoneVerified: false,
            authProviders: {
              google: false,
              email: true,
              apple: false,
              facebook: false,
              phone: true,
            },
            twoFactorEnabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      loginWithProvider("phone", {
        identifier: "+48500111222",
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

  it("calls the forgot password endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message:
            "If an account with this email exists, password reset instructions have been sent.",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(forgotPassword("user@example.com")).resolves.toEqual({
      success: true,
      message:
        "If an account with this email exists, password reset instructions have been sent.",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
        }),
      }),
    );
  });
});
