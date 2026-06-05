import {
  parseSortState,
  sortItems,
  toggleSortState,
} from "./table-sorting";

interface TestItem {
  label?: string;
  value?: number;
}

const accessors = {
  label: (item: TestItem) => item.label,
  value: (item: TestItem) => item.value,
};

describe("table sorting", () => {
  it("keeps the original order when no sort is selected", () => {
    const items = [{ label: "B" }, { label: "A" }];

    expect(sortItems({ items, accessors, state: {} })).toEqual(items);
  });

  it("sorts strings and numbers in the requested direction", () => {
    const items = [
      { label: "B", value: 2 },
      { label: "A", value: 3 },
      { label: "C", value: 1 },
    ];

    expect(
      sortItems({ items, accessors, state: { sort: "label", order: "asc" } })
        .map((item) => item.label),
    ).toEqual(["A", "B", "C"]);
    expect(
      sortItems({ items, accessors, state: { sort: "value", order: "desc" } })
        .map((item) => item.value),
    ).toEqual([3, 2, 1]);
  });

  it("keeps empty values at the end", () => {
    const items = [
      { label: undefined, value: undefined },
      { label: "B", value: 2 },
      { label: "A", value: 1 },
    ];

    expect(
      sortItems({ items, accessors, state: { sort: "label", order: "desc" } })
        .map((item) => item.label ?? "empty"),
    ).toEqual(["B", "A", "empty"]);
  });

  it("parses only allowed sort fields from URL params", () => {
    expect(
      parseSortState({
        allowedSorts: ["label", "value"],
        sort: "value",
        order: "desc",
      }),
    ).toEqual({ sort: "value", order: "desc" });
    expect(
      parseSortState({
        allowedSorts: ["label", "value"],
        sort: "unknown",
        order: "desc",
      }),
    ).toEqual({});
  });

  it("toggles active sort fields between ascending and descending", () => {
    expect(toggleSortState({}, "label")).toEqual({
      sort: "label",
      order: "asc",
    });
    expect(toggleSortState({ sort: "label", order: "asc" }, "label"))
      .toEqual({ sort: "label", order: "desc" });
    expect(toggleSortState({ sort: "label", order: "desc" }, "value"))
      .toEqual({ sort: "value", order: "asc" });
  });
});
