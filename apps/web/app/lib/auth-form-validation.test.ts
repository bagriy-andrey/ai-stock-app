import {
  hasFormErrors,
  validateLoginForm,
  validateSignupForm,
} from "./auth-form-validation";

describe("auth form validation", () => {
  it("requires login identifier and password", () => {
    expect(validateLoginForm({ identifier: "", password: "" })).toEqual({
      identifier: "Enter your email, phone, or nickname.",
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
      phoneNumber: "",
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
      phoneNumber: "",
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
      phoneNumber: "",
      password: "password123",
      confirmPassword: "password123",
    })).toEqual({
      nickname: "Nickname can use letters, numbers, underscore, dot and hyphen.",
    });
  });

  it("rejects invalid optional signup phone numbers", () => {
    expect(validateSignupForm({
      email: "andrii@example.com",
      nickname: "andrii",
      phoneNumber: "+123",
      password: "password123",
      confirmPassword: "password123",
    })).toEqual({
      phoneNumber: "Enter a valid phone number with country code.",
    });
  });

  it("accepts and normalizes valid signup phone numbers", () => {
    const values = {
      email: "andrii@example.com",
      nickname: "andrii",
      phoneNumber: "+48 500 111 222",
      password: "password123",
      confirmPassword: "password123",
    };

    expect(validateSignupForm(values)).toEqual({});
  });

  it("accepts signup phone numbers with international access codes and extensions", () => {
    expect(validateSignupForm({
      email: "andrii@example.com",
      nickname: "andrii",
      phoneNumber: "0048 500 111 222 ext 77",
      password: "password123",
      confirmPassword: "password123",
    })).toEqual({});
  });

  it("accepts a valid signup form", () => {
    const errors = validateSignupForm({
      email: "andrii@example.com",
      nickname: "andrii",
      phoneNumber: "",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(errors).toEqual({});
    expect(hasFormErrors(errors)).toBe(false);
  });
});
