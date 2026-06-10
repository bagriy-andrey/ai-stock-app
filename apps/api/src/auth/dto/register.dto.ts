import type { RegisterWithEmailRequest } from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

function trimLowercaseString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
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

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
