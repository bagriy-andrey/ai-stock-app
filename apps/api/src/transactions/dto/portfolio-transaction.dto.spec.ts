import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePortfolioTransactionDto } from "./create-portfolio-transaction.dto";
import { UpdatePortfolioTransactionDto } from "./update-portfolio-transaction.dto";

describe("Portfolio transaction DTOs", () => {
  const validInput = {
    ticker: " aapl ",
    companyName: " Apple Inc. ",
    type: "buy",
    quantity: "1,5",
    price: "150.25",
    currency: " usd ",
    transactionDate: "2026-05-01T10:30:00.000Z",
  };

  it("normalizes and accepts a valid create request", async () => {
    const dto = plainToInstance(CreatePortfolioTransactionDto, validInput);

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      ticker: "AAPL",
      companyName: "Apple Inc.",
      type: "BUY",
      quantity: 1.5,
      price: 150.25,
      currency: "USD",
    });
  });

  it.each([
    ["quantity", "0"],
    ["quantity", "-1"],
    ["quantity", "00001"],
    ["quantity", "abc"],
    ["quantity", "1e10"],
    ["quantity", "$1"],
    ["price", "0"],
    ["price", "-1"],
    ["price", "00001"],
    ["price", "abc"],
    ["price", "1e10"],
    ["price", "$1"],
  ])("rejects invalid %s values", async (field, value) => {
    const dto = plainToInstance(CreatePortfolioTransactionDto, {
      ...validInput,
      [field]: value,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it("allows only BUY or SELL in create and update requests", async () => {
    const createDto = plainToInstance(CreatePortfolioTransactionDto, {
      ...validInput,
      type: "UPDATE",
    });
    const updateDto = plainToInstance(UpdatePortfolioTransactionDto, {
      type: "DELETE",
    });
    const validUpdateDto = plainToInstance(UpdatePortfolioTransactionDto, {
      type: "SELL",
    });

    await expect(validate(createDto)).resolves.not.toHaveLength(0);
    await expect(validate(updateDto)).resolves.not.toHaveLength(0);
    await expect(validate(validUpdateDto)).resolves.toHaveLength(0);
  });

  it("normalizes optional notes and rejects unsafe notes", async () => {
    const validDto = plainToInstance(UpdatePortfolioTransactionDto, {
      notes: "  Reviewed\r\nQuarterly  ",
    });
    const unsafeDto = plainToInstance(UpdatePortfolioTransactionDto, {
      notes: "<script>alert(1)</script>",
    });
    const oversizedDto = plainToInstance(UpdatePortfolioTransactionDto, {
      notes: "a".repeat(501),
    });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    expect(validDto.notes).toBe("Reviewed\nQuarterly");
    await expect(validate(unsafeDto)).resolves.not.toHaveLength(0);
    await expect(validate(oversizedDto)).resolves.not.toHaveLength(0);
  });
});
