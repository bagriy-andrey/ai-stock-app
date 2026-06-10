import type { ResetPasswordRequest } from "@ai-stock-advisor/shared";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto implements ResetPasswordRequest {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
