import { PasswordHashingService } from "./password-hashing.service";

describe("PasswordHashingService", () => {
  it("hashes passwords with bcrypt without storing the plain value", async () => {
    const service = new PasswordHashingService();
    const hash = await service.hashPassword("StrongPassword123");

    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(hash).not.toContain("StrongPassword123");
  });

  it("verifies valid and invalid bcrypt passwords", async () => {
    const service = new PasswordHashingService();
    const hash = await service.hashPassword("StrongPassword123");

    await expect(
      service.verifyPassword("StrongPassword123", hash),
    ).resolves.toBe(true);
    await expect(service.verifyPassword("wrong-password", hash)).resolves.toBe(
      false,
    );
  });

  it("verifies legacy scrypt password hashes", async () => {
    const service = new PasswordHashingService();
    const hash = await service.hashPasswordWithLegacyScrypt("StrongPassword123");

    await expect(
      service.verifyPassword("StrongPassword123", hash),
    ).resolves.toBe(true);
    await expect(service.verifyPassword("wrong-password", hash)).resolves.toBe(
      false,
    );
  });
});
