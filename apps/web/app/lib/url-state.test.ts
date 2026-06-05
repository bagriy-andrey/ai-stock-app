import {
  parsePageParam,
  parseSortParams,
  parseStringParam,
  updateQueryParams,
} from "./url-state";

describe("url state", () => {
  it("parses invalid pages as page 1", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-1")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
  });

  it("trims string params", () => {
    expect(parseStringParam(" aapl ")).toBe("aapl");
    expect(parseStringParam(null)).toBe("");
  });

  it("parses only allowed sort fields", () => {
    const params = new URLSearchParams("sort=currentValue&order=desc");

    expect(
      parseSortParams({
        allowedSorts: ["name", "currentValue"],
        params,
      }),
    ).toEqual({ sort: "currentValue", order: "desc" });

    expect(
      parseSortParams({
        allowedSorts: ["name", "currentValue"],
        params: new URLSearchParams("sort=unknown&order=desc"),
      }),
    ).toEqual({});
  });

  it("updates query params while omitting empty and default values", () => {
    const params = new URLSearchParams("search=aapl&page=3&sort=name");

    expect(
      updateQueryParams(
        params,
        {
          search: "",
          page: 1,
          sort: "currentValue",
          order: "desc",
        },
        { page: 1 },
      ),
    ).toBe("sort=currentValue&order=desc");
  });
});
