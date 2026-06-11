import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConnectedAccountsSection } from "./ConnectedAccountsSection";

jest.mock("next/script", () => {
  return {
    __esModule: true,
    default: function MockScript() {
      return null;
    },
  };
});

jest.mock("../components/auth/AuthProvider", () => ({
  useAuth: () => ({
    accessToken: "app-jwt",
  }),
}));

describe("ConnectedAccountsSection", () => {
  const profile = {
    id: "user-id",
    email: "user@example.com",
    emailVerified: false,
    name: "Test User",
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
    language: "en" as const,
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  };

  it("renders connected and unconnected provider statuses", () => {
    const html = renderToStaticMarkup(
      <ConnectedAccountsSection
        profile={profile}
        onLinked={jest.fn()}
      />,
    );

    expect(html).toContain("Security");
    expect(html).toContain("Connected accounts");
    expect(html).toContain("Google");
    expect(html).toContain("Connected");
    expect(html).toContain("Apple");
    expect(html).toContain("Not connected");
    expect(html).toContain("Connect Apple");
    expect(html).toContain("Facebook");
    expect(html).toContain("Connect Facebook");
    expect(html).toContain("Email");
    expect(html).toContain("Phone");
  });

  it("uses connected account endpoint data when it is available", () => {
    const html = renderToStaticMarkup(
      <ConnectedAccountsSection
        connectedAccounts={{
          providers: {
            google: false,
            email: true,
            apple: true,
            facebook: true,
            phone: false,
          },
          email: "user@example.com",
          emailVerified: false,
          phoneNumber: "+48500111222",
          phoneVerified: false,
        }}
        profile={profile}
        onLinked={jest.fn()}
      />,
    );

    expect(html).toContain("Connect Google");
    expect(html).not.toContain("Connect Apple");
    expect(html).not.toContain("Connect Facebook");
  });
});
