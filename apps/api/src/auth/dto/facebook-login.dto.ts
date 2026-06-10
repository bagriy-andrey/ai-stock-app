import type { FacebookLoginRequest } from "@ai-stock-advisor/shared";
import { IsNotEmpty, IsString } from "class-validator";

export class FacebookLoginDto implements FacebookLoginRequest {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
