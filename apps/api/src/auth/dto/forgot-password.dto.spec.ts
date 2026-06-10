import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ForgotPasswordDto } from "./forgot-password.dto";

describe("ForgotPasswordDto", () => {
  it("normalizes email", async () => {
    const dto = plainToInstance(ForgotPasswordDto, {
      email: " USER@example.com ",
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.email).toBe("user@example.com");
  });

  it("requires a valid email", async () => {
    const dto = plainToInstance(ForgotPasswordDto, {
      email: "invalid",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("email");
  });
});
