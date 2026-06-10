import { getLoginErrorMessage } from "./auth-login-errors";

describe("auth login errors", () => {
  it("maps invalid credentials to the readable login form message", () => {
    expect(getLoginErrorMessage(new Error("Invalid credentials"))).toBe(
      "Invalid email/nickname or password",
    );
  });

  it("uses non-empty API errors when they are not credential failures", () => {
    expect(getLoginErrorMessage(new Error("Too many requests"))).toBe(
      "Too many requests",
    );
  });

  it("falls back when no useful error message exists", () => {
    expect(getLoginErrorMessage(null)).toBe("Could not log in. Please try again.");
  });
});
