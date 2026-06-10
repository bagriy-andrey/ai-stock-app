import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("FacebookSignInButton", () => {
  const source = readFileSync(join(__dirname, "FacebookSignInButton.tsx"), "utf8");

  it("loads the Facebook SDK and starts the login flow", () => {
    expect(source).toContain("https://connect.facebook.net/en_US/sdk.js");
    expect(source).toContain("window.FB.login");
    expect(source).toContain('scope: "email,public_profile"');
  });

  it("routes successful login through shared auth state", () => {
    expect(source).toContain('loginWithProvider("facebook", payload)');
    expect(source).toContain('router.replace("/")');
  });

  it("shows a readable Facebook login error", () => {
    expect(source).toContain("Facebook login failed. Please try again.");
    expect(source).toContain("Facebook login was cancelled.");
  });
});
