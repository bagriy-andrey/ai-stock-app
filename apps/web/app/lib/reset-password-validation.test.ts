import { validateResetPasswordForm } from "./reset-password-validation";

describe("validateResetPasswordForm", () => {
  it("requires a token", () => {
    expect(
      validateResetPasswordForm({
        token: "",
        password: "NewStrongPassword123",
        confirmPassword: "NewStrongPassword123",
      }),
    ).toEqual({
      token: "Invalid reset link.",
    });
  });

  it("requires password and confirmation", () => {
    expect(
      validateResetPasswordForm({
        token: "raw-reset-token",
        password: "",
        confirmPassword: "",
      }),
    ).toEqual({
      password: "Enter a new password.",
      confirmPassword: "Confirm your new password.",
    });
  });

  it("rejects short passwords", () => {
    expect(
      validateResetPasswordForm({
        token: "raw-reset-token",
        password: "short",
        confirmPassword: "short",
      }),
    ).toEqual({
      password: "Password must be at least 8 characters.",
    });
  });

  it("rejects mismatched passwords", () => {
    expect(
      validateResetPasswordForm({
        token: "raw-reset-token",
        password: "NewStrongPassword123",
        confirmPassword: "DifferentPassword123",
      }),
    ).toEqual({
      confirmPassword: "Passwords do not match.",
    });
  });

  it("accepts valid reset password values", () => {
    expect(
      validateResetPasswordForm({
        token: " raw-reset-token ",
        password: "NewStrongPassword123",
        confirmPassword: "NewStrongPassword123",
      }),
    ).toEqual({});
  });
});
