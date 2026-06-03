import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PaginationQueryDto } from "./pagination-query.dto";

describe("PaginationQueryDto", () => {
  it("uses default pagination values", async () => {
    const dto = plainToInstance(PaginationQueryDto, {});

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, limit: 10 });
  });

  it("accepts custom page and limit values", async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      page: "2",
      limit: "25",
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, limit: 25 });
  });

  it.each([
    { page: "0", limit: "10" },
    { page: "1", limit: "0" },
    { page: "1", limit: "101" },
    { page: "1.5", limit: "10" },
  ])("rejects invalid pagination values %#", async (input) => {
    const dto = plainToInstance(PaginationQueryDto, input);

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
