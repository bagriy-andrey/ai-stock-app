import { BadRequestException } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { ProfileAvatarStorageService } from "./profile-avatar-storage.service";

describe("ProfileAvatarStorageService", () => {
  let directory: string;
  let service: ProfileAvatarStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "profile-avatar-"));
    process.env.PROFILE_UPLOAD_DIR = directory;
    service = new ProfileAvatarStorageService();
  });

  afterEach(async () => {
    delete process.env.PROFILE_UPLOAD_DIR;
    await rm(directory, { force: true, recursive: true });
  });

  it("stores and deletes supported local avatar files", async () => {
    const contents = Buffer.from("avatar");
    const avatarUrl = await service.save({
      buffer: contents,
      mimetype: "image/png",
      size: contents.length,
    });

    await expect(readFile(join(directory, basename(avatarUrl)))).resolves.toEqual(
      contents,
    );
    await service.remove(avatarUrl);
    await expect(readFile(join(directory, basename(avatarUrl)))).rejects.toThrow();
  });

  it("rejects unsupported image formats", async () => {
    await expect(
      service.save({
        buffer: Buffer.from("avatar"),
        mimetype: "image/gif",
        size: 6,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
