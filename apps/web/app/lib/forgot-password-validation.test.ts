import { validateForgotPasswordForm } from "./forgot-password-validation";

describe("validateForgotPasswordForm", () => {
  it("requires email", () => {
    expect(validateForgotPasswordForm({ email: "" })).toEqual({
      email: "Enter your email.",
    });
  });

  it("validates email format", () => {
    expect(validateForgotPasswordForm({ email: "invalid" })).toEqual({
      email: "Enter a valid email address.",
    });
  });

  it("accepts valid email with surrounding whitespace", () => {
    expect(validateForgotPasswordForm({ email: " user@example.com " })).toEqual({});
  });
});
