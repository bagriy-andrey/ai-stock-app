import {
  getPageAfterRemovingCurrentItem,
  resolveValidPage,
  shouldShowPagination,
} from "./pagination-state";

describe("pagination state", () => {
  it("hides pagination for filtered results with 10 or fewer records", () => {
    expect(
      shouldShowPagination(
        {
          page: 1,
          limit: 10,
          totalItems: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        10,
      ),
    ).toBe(false);
  });

  it("hides pagination for empty filtered results", () => {
    expect(
      shouldShowPagination(
        {
          page: 1,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        10,
      ),
    ).toBe(false);
  });

  it("shows pagination when filtered results exceed the page size", () => {
    expect(
      shouldShowPagination(
        {
          page: 1,
          limit: 10,
          totalItems: 11,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
        10,
      ),
    ).toBe(true);
  });

  it("moves to the last valid page when the current page becomes invalid", () => {
    expect(
      resolveValidPage(3, {
        page: 3,
        limit: 10,
        totalItems: 20,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      }),
    ).toBe(2);
  });

  it("moves off an invalid empty last page after deleting the only item there", () => {
    expect(
      getPageAfterRemovingCurrentItem({
        currentPage: 3,
        currentItemsCount: 1,
        meta: {
          page: 3,
          limit: 10,
          totalItems: 21,
          totalPages: 3,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      }),
    ).toBe(2);
  });

  it("stays on page 1 after deleting the last remaining item", () => {
    expect(
      getPageAfterRemovingCurrentItem({
        currentPage: 1,
        currentItemsCount: 1,
        meta: {
          page: 1,
          limit: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    ).toBe(1);
  });
});
