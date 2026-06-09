import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateProfileDto } from "./update-profile.dto";

describe("UpdateProfileDto", () => {
  it("trims text and converts cleared optional fields to null", async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      firstName: "  Ada ",
      lastName: "  ",
      nickname: " analyst ",
      language: "uk",
      theme: "system",
      watchlistViewMode: "list",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual({
      firstName: "Ada",
      lastName: null,
      nickname: "analyst",
      language: "uk",
      theme: "system",
      watchlistViewMode: "list",
    });
  });

  it("rejects unsupported language, theme, and watchlist view values", async () => {
    const errors = await validate(
      plainToInstance(UpdateProfileDto, {
        language: "de",
        theme: "sepia",
        watchlistViewMode: "cards",
      }),
    );

    expect(errors).toHaveLength(3);
  });
});
