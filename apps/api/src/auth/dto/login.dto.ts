import type { LoginWithEmailRequest } from "@ai-stock-advisor/shared";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class LoginDto implements LoginWithEmailRequest {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
