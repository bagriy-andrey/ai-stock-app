import {
  hasFormErrors,
  validateLoginForm,
  validateSignupForm,
} from "./auth-form-validation";

describe("auth form validation", () => {
  it("requires login identifier and password", () => {
    expect(validateLoginForm({ identifier: "", password: "" })).toEqual({
      identifier: "Enter your email or nickname.",
      password: "Enter your password.",
    });
  });

  it("accepts a complete login form", () => {
    expect(validateLoginForm({
      identifier: "andrii@example.com",
      password: "password123",
    })).toEqual({});
  });

  it("validates signup email, nickname, password and confirmation", () => {
    expect(validateSignupForm({
      email: "invalid",
      nickname: "ab",
      password: "short",
      confirmPassword: "different",
    })).toEqual({
      email: "Enter a valid email address.",
      nickname: "Nickname must be 3-30 characters.",
      password: "Password must be at least 8 characters.",
      confirmPassword: "Passwords must match.",
    });
  });

  it("requires signup fields", () => {
    expect(validateSignupForm({
      email: "",
      nickname: "",
      password: "",
      confirmPassword: "",
    })).toEqual({
      email: "Enter your email.",
      nickname: "Enter your nickname.",
      password: "Enter your password.",
      confirmPassword: "Confirm your password.",
    });
  });

  it("rejects signup nicknames with unsupported characters", () => {
    expect(validateSignupForm({
      email: "andrii@example.com",
      nickname: "andrii!",
      password: "password123",
      confirmPassword: "password123",
    })).toEqual({
      nickname: "Nickname can use letters, numbers, underscore, dot and hyphen.",
    });
  });

  it("accepts a valid signup form", () => {
    const errors = validateSignupForm({
      email: "andrii@example.com",
      nickname: "andrii",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(errors).toEqual({});
    expect(hasFormErrors(errors)).toBe(false);
  });
});
