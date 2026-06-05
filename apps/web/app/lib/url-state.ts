"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { SortState } from "./table-sorting";
import { parseSortState } from "./table-sorting";

export type QueryParamValue = string | number | null | undefined;

export type QueryParamsReader = Pick<URLSearchParams, "get" | "toString">;

export function parsePageParam(value: string | null | undefined): number {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseStringParam(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function parseSortParams<SortKey extends string>({
  allowedSorts,
  params,
}: {
  allowedSorts: readonly SortKey[];
  params: QueryParamsReader;
}): SortState<SortKey> {
  return parseSortState({
    allowedSorts,
    sort: params.get("sort"),
    order: params.get("order"),
  });
}

export function updateQueryParams(
  currentParams: QueryParamsReader,
  updates: Record<string, QueryParamValue>,
  defaults: Record<string, QueryParamValue> = {},
): string {
  const params = new URLSearchParams(currentParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    const defaultValue = defaults[key];
    const normalizedValue =
      typeof value === "string" ? value.trim() : value;

    if (
      normalizedValue === undefined ||
      normalizedValue === null ||
      normalizedValue === "" ||
      (defaultValue !== undefined && String(normalizedValue) === String(defaultValue))
    ) {
      params.delete(key);
      continue;
    }

    params.set(key, String(normalizedValue));
  }

  return params.toString();
}

export function useUrlState<State extends object>({
  defaults = {},
  managedKeys,
  parse,
  serialize,
}: {
  defaults?: Record<string, QueryParamValue>;
  managedKeys: readonly string[];
  parse: (params: QueryParamsReader) => State;
  serialize: (state: State) => Record<string, QueryParamValue>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(
    () => parse(searchParams),
    [parse, searchParams],
  );

  const setState = useCallback(
    (updates: Partial<State>) => {
      const nextState = { ...state, ...updates };
      const unmanagedParams = new URLSearchParams(searchParams.toString());

      for (const key of managedKeys) {
        unmanagedParams.delete(key);
      }

      const query = updateQueryParams(
        unmanagedParams,
        serialize(nextState),
        defaults,
      );
      const nextUrl = query ? `${pathname}?${query}` : pathname;
      const currentQuery = searchParams.toString();
      const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;

      if (nextUrl !== currentUrl) {
        router.push(nextUrl, { scroll: false });
      }
    },
    [defaults, managedKeys, pathname, router, searchParams, serialize, state],
  );

  return { setState, state };
}
