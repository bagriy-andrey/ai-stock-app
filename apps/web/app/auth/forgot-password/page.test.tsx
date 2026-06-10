import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ForgotPasswordPage from "./page";

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

jest.mock("../../lib/auth-api", () => ({
  forgotPassword: jest.fn(),
}));

describe("ForgotPasswordPage", () => {
  it("renders the forgot password request form", () => {
    const html = renderToStaticMarkup(<ForgotPasswordPage />);

    expect(html).toContain("Forgot password?");
    expect(html).toContain(
      "Enter your email and we&#x27;ll send you password reset instructions.",
    );
    expect(html).toContain('name="email"');
    expect(html).toContain("Send reset instructions");
  });

  it("links back to login", () => {
    const html = renderToStaticMarkup(<ForgotPasswordPage />);

    expect(html).toContain('href="/login"');
    expect(html).toContain("Back to login");
  });
});
