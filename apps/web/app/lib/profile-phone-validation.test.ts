import {
  normalizeOptionalProfilePhoneNumber,
  validateOptionalProfilePhoneNumber,
} from "./profile-phone-validation";

describe("profile phone validation", () => {
  it("normalizes formatted profile phone numbers", () => {
    expect(normalizeOptionalProfilePhoneNumber("+380 67 123 45 67")).toBe(
      "+380671234567",
    );
  });

  it("normalizes profile phone numbers with an international access code and extension", () => {
    expect(normalizeOptionalProfilePhoneNumber("0048 500 111 222 x55")).toBe(
      "+48500111222",
    );
  });

  it("uses null to clear empty profile phone numbers", () => {
    expect(normalizeOptionalProfilePhoneNumber("  ")).toBeNull();
  });

  it("returns a readable error for invalid profile phone numbers", () => {
    expect(validateOptionalProfilePhoneNumber("+123")).toBe(
      "Enter a valid phone number with country code.",
    );
  });

  it("accepts empty and valid profile phone numbers", () => {
    expect(validateOptionalProfilePhoneNumber("")).toBeUndefined();
    expect(validateOptionalProfilePhoneNumber("+48 500 111 222")).toBeUndefined();
  });
});
