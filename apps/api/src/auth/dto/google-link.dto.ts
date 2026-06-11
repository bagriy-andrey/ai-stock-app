import type { GoogleLinkRequest } from "@ai-stock-advisor/shared";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleLinkDto implements GoogleLinkRequest {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
