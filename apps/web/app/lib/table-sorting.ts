export type SortOrder = "asc" | "desc";

export interface SortState<SortKey extends string> {
  sort?: SortKey;
  order?: SortOrder;
}

type SortValue = string | number | Date | null | undefined;

type SortAccessors<Item, SortKey extends string> = Record<
  SortKey,
  (item: Item) => SortValue
>;

export function parseSortOrder(value: string | null | undefined): SortOrder {
  return value === "desc" ? "desc" : "asc";
}

export function parseSortState<SortKey extends string>({
  allowedSorts,
  order,
  sort,
}: {
  allowedSorts: readonly SortKey[];
  order?: string | null;
  sort?: string | null;
}): SortState<SortKey> {
  const matchedSort = allowedSorts.find((allowedSort) => allowedSort === sort);

  if (!matchedSort) {
    return {};
  }

  return {
    sort: matchedSort,
    order: parseSortOrder(order),
  };
}

export function toggleSortState<SortKey extends string>(
  currentState: SortState<SortKey>,
  sort: SortKey,
): Required<SortState<SortKey>> {
  if (currentState.sort === sort) {
    return {
      sort,
      order: currentState.order === "asc" ? "desc" : "asc",
    };
  }

  return { sort, order: "asc" };
}

export function sortItems<Item, SortKey extends string>({
  accessors,
  items,
  state,
}: {
  accessors: SortAccessors<Item, SortKey>;
  items: readonly Item[];
  state: SortState<SortKey>;
}): Item[] {
  if (!state.sort || !state.order) {
    return [...items];
  }

  const accessor = accessors[state.sort];
  const direction = state.order === "asc" ? 1 : -1;

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const compared = compareSortValues(
        accessor(left.item),
        accessor(right.item),
        direction,
      );

      return compared === 0 ? left.index - right.index : compared;
    })
    .map(({ item }) => item);
}

function compareSortValues(
  leftValue: SortValue,
  rightValue: SortValue,
  direction: 1 | -1,
): number {
  const normalizedLeft = normalizeSortValue(leftValue);
  const normalizedRight = normalizeSortValue(rightValue);

  if (normalizedLeft === null && normalizedRight === null) {
    return 0;
  }

  if (normalizedLeft === null) {
    return 1;
  }

  if (normalizedRight === null) {
    return -1;
  }

  if (typeof normalizedLeft === "number" && typeof normalizedRight === "number") {
    return (normalizedLeft - normalizedRight) * direction;
  }

  return String(normalizedLeft).localeCompare(String(normalizedRight), undefined, {
    numeric: true,
    sensitivity: "base",
  }) * direction;
}

function normalizeSortValue(value: SortValue): string | number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();

    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}
