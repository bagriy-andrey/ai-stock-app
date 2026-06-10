import {
  generateKeyPairSync,
  type JsonWebKey as CryptoJsonWebKey,
  type KeyObject,
} from "node:crypto";
import jwt from "jsonwebtoken";
import { AppleAuthService } from "./apple-auth.service";

type TestAppleJwk = CryptoJsonWebKey & {
  kid: string;
  alg: string;
  use: string;
};

describe("AppleAuthService", () => {
  const originalFetch = global.fetch;
  let privateKey: KeyObject;
  let publicJwk: TestAppleJwk;
  let service: AppleAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.APPLE_CLIENT_ID = "com.example.web";
    const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    privateKey = keyPair.privateKey;
    publicJwk = {
      ...keyPair.publicKey.export({ format: "jwk" }),
      kid: "apple-key-id",
      alg: "RS256",
      use: "sig",
    };
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    service = new AppleAuthService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("verifies a valid Apple identity token", async () => {
    const token = signAppleToken({
      sub: "apple-user-id",
      email: "relay@example.com",
      email_verified: "true",
    });

    await expect(
      service.verifyIdentityToken({
        identityToken: token,
        user: {
          firstName: "Test",
          lastName: "User",
        },
      }),
    ).resolves.toEqual({
      providerId: "apple-user-id",
      email: "relay@example.com",
      emailVerified: true,
      firstName: "Test",
      lastName: "User",
    });
  });

  it("rejects an invalid token", async () => {
    await expect(
      service.verifyIdentityToken({ identityToken: "not-a-jwt" }),
    ).rejects.toThrow("Invalid Apple identity token");
  });

  it("rejects a token with the wrong audience", async () => {
    const token = signAppleToken(
      {
        sub: "apple-user-id",
        email_verified: true,
      },
      { audience: "com.example.other" },
    );

    await expect(
      service.verifyIdentityToken({ identityToken: token }),
    ).rejects.toThrow("Invalid Apple identity token");
  });

  it("rejects an expired token", async () => {
    const token = signAppleToken(
      {
        sub: "apple-user-id",
        email_verified: true,
      },
      { expiresIn: -10 },
    );

    await expect(
      service.verifyIdentityToken({ identityToken: token }),
    ).rejects.toThrow("Invalid Apple identity token");
  });

  function signAppleToken(
    payload: Record<string, unknown>,
    options: { audience?: string; expiresIn?: number } = {},
  ): string {
    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      audience: options.audience ?? "com.example.web",
      expiresIn: options.expiresIn ?? 300,
      issuer: "https://appleid.apple.com",
      keyid: "apple-key-id",
    });
  }
});
