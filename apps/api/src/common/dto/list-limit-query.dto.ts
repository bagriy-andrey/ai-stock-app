import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const maxListLimit = 50;

export class ListLimitQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(maxListLimit)
  limit?: number;
}
