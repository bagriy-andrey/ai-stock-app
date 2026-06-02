import { resolve } from "node:path";

export const profileAvatarPublicPath = "/uploads/avatars";
export const profileAvatarMaxBytes = 5 * 1024 * 1024;

export function getProfileAvatarDirectory(): string {
  return resolve(process.env.PROFILE_UPLOAD_DIR ?? "uploads/avatars");
}
