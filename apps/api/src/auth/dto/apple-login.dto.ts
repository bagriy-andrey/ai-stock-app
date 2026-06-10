import type { AppleLoginRequest } from "@ai-stock-advisor/shared";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class AppleLoginUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}

export class AppleLoginDto implements AppleLoginRequest {
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @IsOptional()
  @IsString()
  authorizationCode?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AppleLoginUserDto)
  user?: AppleLoginUserDto;
}
