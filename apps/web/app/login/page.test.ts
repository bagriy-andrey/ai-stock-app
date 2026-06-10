import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LoginPage", () => {
  it("links to the forgot password page", () => {
    const source = readFileSync(join(__dirname, "page.tsx"), "utf8");

    expect(source).toContain('href="/auth/forgot-password"');
    expect(source).toContain("Forgot password?");
  });
});
