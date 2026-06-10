import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto";

describe("LoginDto", () => {
  it("trims the identifier", async () => {
    const dto = plainToInstance(LoginDto, {
      identifier: " user@example.com ",
      password: "StrongPassword123",
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.identifier).toBe("user@example.com");
  });

  it("requires identifier and password strings", async () => {
    const dto = plainToInstance(LoginDto, {
      identifier: "",
      password: "",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["identifier", "password"]),
    );
  });
});
