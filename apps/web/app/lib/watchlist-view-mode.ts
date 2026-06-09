import type { WatchlistViewMode } from "@ai-stock-advisor/shared";

export const defaultWatchlistViewMode: WatchlistViewMode = "grid";

export function normalizeWatchlistViewMode(
  value: unknown,
): WatchlistViewMode {
  return value === "grid" || value === "list"
    ? value
    : defaultWatchlistViewMode;
}
