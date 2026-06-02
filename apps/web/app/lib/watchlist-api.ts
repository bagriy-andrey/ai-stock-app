import type {
  CreateWatchlistItemRequest,
  WatchlistItemDto,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

function authHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export function fetchWatchlist(accessToken: string): Promise<WatchlistItemDto[]> {
  return apiRequest<WatchlistItemDto[]>("/watchlist", {
    headers: authHeaders(accessToken),
  });
}

export function addWatchlistItem(
  accessToken: string,
  input: CreateWatchlistItemRequest,
): Promise<WatchlistItemDto> {
  return apiRequest<WatchlistItemDto>("/watchlist", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
}

export function removeWatchlistItem(
  accessToken: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/watchlist/${id}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}
