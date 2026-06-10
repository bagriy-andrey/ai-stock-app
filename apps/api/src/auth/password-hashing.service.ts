import { Injectable } from "@nestjs/common";
import { compare as compareBcrypt, hash as hashBcrypt } from "bcryptjs";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const bcryptCost = 12;

@Injectable()
export class PasswordHashingService {
  async hashPassword(password: string): Promise<string> {
    return hashBcrypt(password, bcryptCost);
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    if (isBcryptHash(passwordHash)) {
      return compareBcrypt(password, passwordHash);
    }

    if (passwordHash.startsWith("scrypt:")) {
      return this.verifyLegacyScryptPassword(password, passwordHash);
    }

    return false;
  }

  private async verifyLegacyScryptPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const [, salt, expectedHash] = passwordHash.split(":");

    if (!salt || !expectedHash) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedHash, "hex");
    const actualBuffer = (await scrypt(password, salt, expectedBuffer.length)) as Buffer;

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  async hashPasswordWithLegacyScrypt(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(password, salt, keyLength)) as Buffer;

    return `scrypt:${salt}:${hash.toString("hex")}`;
  }
}

function isBcryptHash(passwordHash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(passwordHash);
}
