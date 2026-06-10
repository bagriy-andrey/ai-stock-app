import type {
  ProfileLanguage,
  ProfileTheme,
  WatchlistViewMode,
} from "@ai-stock-advisor/shared";
import { normalizePhoneNumber } from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateBy,
} from "class-validator";

function trimOptionalText({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalPhoneNumber({ value }: { value: unknown }): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
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

export class UpdateProfileDto {
  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @Transform(trimOptionalText)
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  nickname?: string | null;

  @Transform(normalizeOptionalPhoneNumber)
  @IsOptional()
  @IsString()
  @IsNormalizedPhoneNumber()
  phoneNumber?: string | null;

  @IsOptional()
  @IsIn(["en", "ru", "uk"])
  language?: ProfileLanguage;

  @IsOptional()
  @IsIn(["light", "dark", "system"])
  theme?: ProfileTheme;

  @IsOptional()
  @IsIn(["grid", "list"])
  watchlistViewMode?: WatchlistViewMode;
}
