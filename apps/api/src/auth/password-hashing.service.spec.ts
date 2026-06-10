import { PasswordHashingService } from "./password-hashing.service";

describe("PasswordHashingService", () => {
  it("hashes passwords without storing the plain value", async () => {
    const service = new PasswordHashingService();
    const hash = await service.hashPassword("StrongPassword123");

    expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
    expect(hash).not.toContain("StrongPassword123");
  });
});
