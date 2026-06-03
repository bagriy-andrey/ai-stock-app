import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { defaultLimit, defaultPage, maxLimit } from "../pagination";

export class PaginationQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = defaultPage;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(maxLimit)
  limit: number = defaultLimit;
}
