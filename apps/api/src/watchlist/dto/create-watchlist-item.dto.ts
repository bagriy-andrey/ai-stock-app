import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";

export class CreateWatchlistItemDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][A-Z0-9.-]{0,9}$/, {
    message: "ticker must be a valid stock ticker",
  })
  ticker!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsOptional()
  @IsString()
  companyName?: string;
}
