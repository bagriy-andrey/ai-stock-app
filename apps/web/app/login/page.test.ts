import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LoginPage", () => {
  it("links to the forgot password page", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain('href="/auth/forgot-password"');
    expect(source).toContain("Forgot password?");
  });

  it("uses enabled Apple and Facebook sign-in buttons", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain("<AppleSignInButton />");
    expect(source).toContain("<FacebookSignInButton />");
    expect(source).not.toContain("Apple login is coming soon");
    expect(source).not.toContain("Facebook login is coming soon");
    expect(source).not.toContain('statusLabel="Coming soon"');
  });
});
