import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterDto } from "./register.dto";

describe("RegisterDto", () => {
  it("normalizes email and nickname", async () => {
    const dto = plainToInstance(RegisterDto, {
      email: " USER@example.com ",
      nickname: " Andrey-1 ",
      password: "StrongPassword123",
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.email).toBe("user@example.com");
    expect(dto.nickname).toBe("andrey-1");
  });

  it("rejects invalid email and short password", async () => {
    const dto = plainToInstance(RegisterDto, {
      email: "invalid",
      nickname: "andrey",
      password: "short",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["email", "password"]),
    );
  });

  it("rejects invalid nickname characters", async () => {
    const dto = plainToInstance(RegisterDto, {
      email: "user@example.com",
      nickname: "andrey!",
      password: "StrongPassword123",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("nickname");
  });
});
