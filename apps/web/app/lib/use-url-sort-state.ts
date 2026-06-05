"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { SortState } from "./table-sorting";
import { toggleSortState } from "./table-sorting";

export function useUrlSortState<SortKey extends string>({
  initialState,
  onSortChange,
}: {
  initialState: SortState<SortKey>;
  onSortChange?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sortState, setSortState] = useState<SortState<SortKey>>(initialState);

  const setSort = (sort: SortKey) => {
    setSortState((currentState) => {
      const nextState = toggleSortState(currentState, sort);
      const params = new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      );

      params.set("sort", nextState.sort);
      params.set("order", nextState.order);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      onSortChange?.();

      return nextState;
    });
  };

  return { sortState, setSort };
}
