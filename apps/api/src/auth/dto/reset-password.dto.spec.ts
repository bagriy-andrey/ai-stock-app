import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ResetPasswordDto } from "./reset-password.dto";

describe("ResetPasswordDto", () => {
  it("accepts a token and a valid password", async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: "raw-reset-token",
      password: "NewStrongPassword123",
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it("requires token and password strings", async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: "",
      password: "",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["token", "password"]),
    );
  });

  it("rejects short passwords", async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: "raw-reset-token",
      password: "short",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("password");
  });
});
