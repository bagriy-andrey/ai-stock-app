import { IsNotEmpty, IsString } from "class-validator";
import type { GoogleLoginRequest } from "@ai-stock-advisor/shared";

export class GoogleLoginDto implements GoogleLoginRequest {
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
