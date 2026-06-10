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

  it("normalizes optional phone numbers", async () => {
    const dto = plainToInstance(RegisterDto, {
      email: "user@example.com",
      nickname: "andrey",
      phoneNumber: " +48 500 111 222 ",
      password: "StrongPassword123",
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.phoneNumber).toBe("+48500111222");
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

  it("rejects invalid phone numbers", async () => {
    const dto = plainToInstance(RegisterDto, {
      email: "user@example.com",
      nickname: "andrey",
      phoneNumber: "+123",
      password: "StrongPassword123",
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("phoneNumber");
  });
});
