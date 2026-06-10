import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LoginPage", () => {
  it("links to the forgot password page", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain('href="/auth/forgot-password"');
    expect(source).toContain("Forgot password?");
  });

  it("uses the enabled Apple sign-in button and keeps Facebook coming soon", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain("<AppleSignInButton />");
    expect(source).not.toContain("Apple login is coming soon");
    expect(source).toContain("Facebook login is coming soon");
    expect(source).toContain('statusLabel="Coming soon"');
  });
});
