import type { ForgotPasswordRequest } from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty } from "class-validator";

function trimLowercaseString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @Transform(trimLowercaseString)
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
