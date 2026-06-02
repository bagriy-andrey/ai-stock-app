import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  getProfileAvatarDirectory,
  profileAvatarMaxBytes,
  profileAvatarPublicPath,
} from "./profile-avatar.config";

export interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const avatarFileExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

@Injectable()
export class ProfileAvatarStorageService {
  private readonly logger = new Logger(ProfileAvatarStorageService.name);
  private readonly directory = getProfileAvatarDirectory();

  async save(file: UploadedAvatarFile | undefined): Promise<string> {
    if (!file) {
      throw new BadRequestException("avatar file is required");
    }

    const extension = avatarFileExtensions[file.mimetype];

    if (!extension) {
      throw new BadRequestException("avatar must be a JPEG, PNG, or WebP image");
    }

    if (file.size === 0 || file.size > profileAvatarMaxBytes) {
      throw new BadRequestException("avatar must be no larger than 5 MB");
    }

    const filename = `${randomUUID()}.${extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, filename), file.buffer);

    return `${profileAvatarPublicPath}/${filename}`;
  }

  async remove(avatarUrl: string | undefined): Promise<void> {
    if (!avatarUrl?.startsWith(`${profileAvatarPublicPath}/`)) {
      return;
    }

    const filename = basename(avatarUrl);

    try {
      await unlink(join(this.directory, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.logger.warn(`Unable to remove local avatar file: ${filename}`);
      }
    }
  }
}
