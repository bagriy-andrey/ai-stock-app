import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

@Injectable()
export class PasswordHashingService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(password, salt, keyLength)) as Buffer;

    return `scrypt:${salt}:${hash.toString("hex")}`;
  }
}
