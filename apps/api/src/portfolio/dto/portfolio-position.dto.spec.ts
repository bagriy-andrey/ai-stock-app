import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePortfolioPositionDto } from "./create-portfolio-position.dto";
import { UpdatePortfolioPositionDto } from "./update-portfolio-position.dto";

describe("Portfolio position DTOs", () => {
  const validInput = {
    ticker: " aapl ",
    companyName: " Apple Inc. ",
    quantity: 2,
    averagePurchasePrice: 150,
    currency: " usd ",
    purchaseDate: "2026-05-01",
  };

  it("normalizes and accepts a valid create request", async () => {
    const dto = plainToInstance(CreatePortfolioPositionDto, validInput);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      ticker: "AAPL",
      companyName: "Apple Inc.",
      quantity: 2,
      averagePurchasePrice: 150,
      currency: "USD",
      purchaseDate: "2026-05-01",
    });
  });

  it.each([
    ["quantity", 0],
    ["quantity", -1],
    ["quantity", 0.00009],
    ["quantity", 100000001],
    ["quantity", "00001"],
    ["quantity", "1e10"],
    ["averagePurchasePrice", 0],
    ["averagePurchasePrice", -1],
    ["averagePurchasePrice", 0.00009],
    ["averagePurchasePrice", 100000001],
    ["averagePurchasePrice", "abc"],
    ["ticker", ""],
    ["currency", ""],
    ["currency", "EUR"],
  ])("rejects invalid %s values", async (field, value) => {
    const dto = plainToInstance(CreatePortfolioPositionDto, {
      ...validInput,
      [field]: value,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("accepts a partial update and validates positive numbers", async () => {
    const validDto = plainToInstance(UpdatePortfolioPositionDto, {
      quantity: 3,
    });
    const invalidDto = plainToInstance(UpdatePortfolioPositionDto, {
      quantity: 0,
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.quantity).toBe(3);
    await expect(validate(invalidDto)).resolves.not.toHaveLength(0);
  });

  it("rejects future purchase dates", async () => {
    const createDto = plainToInstance(CreatePortfolioPositionDto, {
      ...validInput,
      purchaseDate: "2999-05-01T10:30:00.000Z",
    });
    const updateDto = plainToInstance(UpdatePortfolioPositionDto, {
      purchaseDate: "2999-05-01T10:30:00.000Z",
    });

    await expect(validate(createDto)).resolves.not.toHaveLength(0);
    await expect(validate(updateDto)).resolves.not.toHaveLength(0);
  });

  it("normalizes optional notes and rejects unsafe notes", async () => {
    const validDto = plainToInstance(CreatePortfolioPositionDto, {
      ...validInput,
      notes: "  Long-term position\r\nReviewed quarterly  ",
    });
    const unsafeDto = plainToInstance(CreatePortfolioPositionDto, {
      ...validInput,
      notes: "<script>alert(1)</script>",
    });
    const oversizedDto = plainToInstance(CreatePortfolioPositionDto, {
      ...validInput,
      notes: "a".repeat(501),
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.notes).toBe("Long-term position\nReviewed quarterly");
    await expect(validate(unsafeDto)).resolves.not.toHaveLength(0);
    await expect(validate(oversizedDto)).resolves.not.toHaveLength(0);
  });
});
