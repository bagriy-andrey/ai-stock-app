import type {
  ProfileLanguage,
  ProfileTheme,
  WatchlistViewMode,
} from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

function trimOptionalText({ value }: { value: unknown }): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
