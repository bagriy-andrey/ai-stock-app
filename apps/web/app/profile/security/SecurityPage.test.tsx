import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AuthUser, UserDto } from "@ai-stock-advisor/shared";
import {
  SecuritySettingsContent,
  toConnectedAccountsSnapshot,
} from "./SecurityPage";

jest.mock("next/script", () => {
  return {
    __esModule: true,
    default: function MockScript() {
      return null;
    },
  };
});

jest.mock("../../components/auth/AuthProvider", () => ({
  useAuth: () => ({
    accessToken: "app-jwt",
  }),
}));

describe("SecuritySettingsContent", () => {
  const profile: UserDto = {
    id: "user-id",
    email: "user@example.com",
    emailVerified: false,
    name: "Test User",
    nickname: "tester",
    phoneNumber: "+48500111222",
    phoneVerified: false,
    authProviders: {
      google: true,
      email: true,
      apple: false,
      facebook: false,
      phone: true,
    },
    twoFactorEnabled: false,
    twoFactorMethod: null,
    language: "en",
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  };

  it("renders security settings with connected statuses and connect buttons", () => {
    const html = renderSecurityContent(profile);

    expect(html).toContain("Sign-in methods");
    expect(html).toContain("Google");
    expect(html).toContain("Connected");
    expect(html).toContain("Apple");
    expect(html).toContain("Connect Apple");
    expect(html).toContain("Facebook");
    expect(html).toContain("Connect Facebook");
    expect(html).toContain("Email");
    expect(html).toContain("Phone");
  });

  it("renders password enabled and 2FA disabled states", () => {
    const html = renderSecurityContent(profile);

    expect(html).toContain("Password");
    expect(html).toContain("Enabled");
    expect(html).toContain(
      "You can use email, nickname or phone number with your password to sign in.",
    );
    expect(html).toContain("Two-factor authentication");
    expect(html).toContain("Disabled");
    expect(html).toContain("Set up 2FA");
  });

  it("renders password not set and 2FA enabled states", () => {
    const html = renderSecurityContent({
      ...profile,
      authProviders: {
        google: true,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      phoneNumber: undefined,
      twoFactorEnabled: true,
    });

    expect(html).toContain("Not set");
    expect(html).toContain(
      "Password sign-in is not enabled for this account yet.",
    );
    expect(html).toContain("Manage 2FA");
  });

  it("renders connected account loading state", () => {
    const html = renderSecurityContent(profile, { connectedAccountsLoading: true });

    expect(html).toContain("Loading connected accounts...");
  });

  it("renders connected account error state", () => {
    const html = renderSecurityContent(profile, { connectedAccountsError: true });

    expect(html).toContain("Connected accounts could not be loaded.");
    expect(html).toContain("Retry");
  });

  it("builds refreshed connected account data after provider linking succeeds", () => {
    const linkedUser: AuthUser = {
      id: "user-id",
      email: "user@example.com",
      nickname: "tester",
      phoneNumber: "+48500111222",
      phoneVerified: false,
      firstName: "Test",
      lastName: "User",
      avatarUrl: undefined,
      authProviders: {
        google: true,
        email: true,
        apple: true,
        facebook: false,
        phone: true,
      },
      twoFactorEnabled: false,
    };

    expect(toConnectedAccountsSnapshot(linkedUser, profile)).toEqual({
      providers: linkedUser.authProviders,
      email: "user@example.com",
      emailVerified: false,
      phoneNumber: "+48500111222",
      phoneVerified: false,
    });
  });
});

function renderSecurityContent(
  profile: UserDto,
  options: {
    connectedAccountsError?: boolean;
    connectedAccountsLoading?: boolean;
  } = {},
) {
  return renderToStaticMarkup(
    <SecuritySettingsContent
      connectedAccountsError={options.connectedAccountsError}
      connectedAccountsLoading={options.connectedAccountsLoading}
      onLinked={jest.fn()}
      onRetryConnectedAccounts={jest.fn()}
      profile={profile}
    />,
  );
}
