import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ResetPasswordPage from "./page";

let token: string | null = "raw-reset-token";

jest.mock("next/link", () => {
  return {
    __esModule: true,
    default: function MockLink({
      children,
      href,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? token : null),
  }),
}));

jest.mock("../../lib/auth-api", () => ({
  resetPassword: jest.fn(),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    token = "raw-reset-token";
  });

  it("renders the reset password form", () => {
    const html = renderToStaticMarkup(<ResetPasswordPage />);

    expect(html).toContain("Reset your password");
    expect(html).toContain("Enter a new password for your account.");
    expect(html).toContain('name="password"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).toContain("Reset Password");
    expect(html).toContain("Show new password");
    expect(html).toContain("Show confirm new password");
  });

  it("shows invalid reset link state when the token is missing", () => {
    token = null;

    const html = renderToStaticMarkup(<ResetPasswordPage />);

    expect(html).toContain("Invalid reset link.");
    expect(html).toContain('href="/login"');
    expect(html).toContain("Back to Log In");
    expect(html).not.toContain('name="password"');
  });

  it("links back to login", () => {
    const html = renderToStaticMarkup(<ResetPasswordPage />);

    expect(html).toContain('href="/login"');
    expect(html).toContain("Back to Log In");
  });

  it("contains the invalid token recovery links and success copy", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain("Your password has been reset successfully.");
    expect(source).toContain("This reset link is invalid or has expired.");
    expect(source).toContain('href="/auth/forgot-password"');
    expect(source).toContain("Request a new reset link");
  });

  it("submits through the reset password API client without auto-login", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain("await resetPassword({");
    expect(source).toContain("setIsSuccess(true)");
    expect(source).not.toContain("loginWithEmail");
    expect(source).not.toContain("applyAuthResponse");
  });
});
