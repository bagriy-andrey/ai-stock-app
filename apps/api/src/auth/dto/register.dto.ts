import {
  normalizePhoneNumber,
  type RegisterWithEmailRequest,
} from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
} from "class-validator";

function trimLowercaseString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function normalizeOptionalPhoneNumber({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return normalizePhoneNumber(trimmed) ?? trimmed;
}

function IsNormalizedPhoneNumber() {
  return ValidateBy({
    name: "isNormalizedPhoneNumber",
    validator: {
      validate: (value: unknown): boolean =>
        typeof value === "string" && normalizePhoneNumber(value) === value,
      defaultMessage: () =>
        "phoneNumber must be a valid phone number with country code",
    },
  });
}

export class RegisterDto implements RegisterWithEmailRequest {
  @Transform(trimLowercaseString)
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Transform(trimLowercaseString)
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9._-]+$/, {
    message:
      "nickname must contain only letters, numbers, underscore, dot, or hyphen",
  })
  nickname!: string;

  @Transform(normalizeOptionalPhoneNumber)
  @IsOptional()
  @IsString()
  @IsNormalizedPhoneNumber()
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
