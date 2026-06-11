import {
  fetchConnectedAccounts,
  forgotPassword,
  linkApple,
  linkFacebook,
  linkGoogle,
  loginWithApple,
  loginWithEmail,
  loginWithFacebook,
  loginWithPhone,
  loginWithProvider,
  resetPassword,
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

  it("calls the Apple login endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            email: "user@example.com",
            authProviders: {
              google: false,
              email: false,
              apple: true,
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
      loginWithApple({
        identityToken: "apple-id-token",
        authorizationCode: "apple-code",
        user: {
          email: "user@example.com",
          firstName: "Test",
          lastName: "User",
        },
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/apple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identityToken: "apple-id-token",
          authorizationCode: "apple-code",
          user: {
            email: "user@example.com",
            firstName: "Test",
            lastName: "User",
          },
        }),
      }),
    );
  });

  it("routes Apple login through the shared provider helper", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            authProviders: {
              google: false,
              email: false,
              apple: true,
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
      loginWithProvider("apple", {
        identityToken: "apple-id-token",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/apple",
      expect.any(Object),
    );
  });

  it("calls the Facebook login endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            email: "user@example.com",
            authProviders: {
              google: false,
              email: false,
              apple: false,
              facebook: true,
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
      loginWithFacebook({
        accessToken: "facebook-access-token",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/facebook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          accessToken: "facebook-access-token",
        }),
      }),
    );
  });

  it("routes Facebook login through the shared provider helper", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: "app-jwt",
          user: {
            id: "user-id",
            authProviders: {
              google: false,
              email: false,
              apple: false,
              facebook: true,
              phone: false,
            },
            twoFactorEnabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      loginWithProvider("facebook", {
        accessToken: "facebook-access-token",
      }),
    ).resolves.toHaveProperty("accessToken", "app-jwt");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/facebook",
      expect.any(Object),
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

  it("calls the reset password endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Password has been reset successfully.",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      resetPassword({
        token: "raw-reset-token",
        password: "NewStrongPassword123",
      }),
    ).resolves.toEqual({
      success: true,
      message: "Password has been reset successfully.",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "raw-reset-token",
          password: "NewStrongPassword123",
        }),
      }),
    );
  });

  it("surfaces invalid or expired reset token responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Invalid or expired reset token" }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      resetPassword({
        token: "expired-token",
        password: "NewStrongPassword123",
      }),
    ).rejects.toThrow("Invalid or expired reset token");
  });

  it("fetches connected accounts with the current access token", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          providers: {
            google: true,
            email: true,
            apple: false,
            facebook: true,
            phone: false,
          },
          email: "user@example.com",
          emailVerified: false,
          phoneVerified: false,
        }),
        { status: 200 },
      ),
    );

    await expect(fetchConnectedAccounts("app-jwt")).resolves.toMatchObject({
      providers: expect.objectContaining({ google: true, facebook: true }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/connected-accounts",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer app-jwt");
  });

  it("calls the Google link endpoint without requesting a new session", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-id",
            authProviders: {
              google: true,
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

    await expect(linkGoogle("app-jwt", "google-id-token")).resolves.toEqual({
      user: expect.objectContaining({ id: "user-id" }),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/link/google",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "google-id-token" }),
      }),
    );
  });

  it("calls the Apple link endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-id",
            authProviders: {
              google: false,
              email: true,
              apple: true,
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
      linkApple("app-jwt", {
        identityToken: "apple-id-token",
        authorizationCode: "apple-code",
      }),
    ).resolves.toHaveProperty("user.id", "user-id");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/link/apple",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          identityToken: "apple-id-token",
          authorizationCode: "apple-code",
        }),
      }),
    );
  });

  it("calls the Facebook link endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-id",
            authProviders: {
              google: false,
              email: true,
              apple: false,
              facebook: true,
              phone: false,
            },
            twoFactorEnabled: false,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(
      linkFacebook("app-jwt", { accessToken: "facebook-access-token" }),
    ).resolves.toHaveProperty("user.id", "user-id");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/link/facebook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ accessToken: "facebook-access-token" }),
      }),
    );
  });

  it("surfaces provider link conflict errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "This Google account is already connected to another user.",
        }),
        {
          status: 409,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(linkGoogle("app-jwt", "google-id-token")).rejects.toThrow(
      "This Google account is already connected to another user.",
    );
  });
});
