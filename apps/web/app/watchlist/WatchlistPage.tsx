"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "../components/auth/AuthProvider";
import {
  addWatchlistItem,
  fetchWatchlist,
  removeWatchlistItem,
} from "../lib/watchlist-api";

const watchlistQueryKey = ["watchlist"] as const;

export function WatchlistPage() {
  const queryClient = useQueryClient();
  const { accessToken, user, logout } = useAuth();
  const [ticker, setTicker] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const watchlistQuery = useQuery({
    queryKey: watchlistQueryKey,
    queryFn: () => fetchWatchlist(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  const addMutation = useMutation({
    mutationFn: (value: string) =>
      addWatchlistItem(accessToken ?? "", { ticker: value }),
    onSuccess: async () => {
      setTicker("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeWatchlistItem(accessToken ?? "", id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: watchlistQueryKey });
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      setFormError("Ticker is required.");
      return;
    }

    addMutation.mutate(normalizedTicker);
  };

  const items = watchlistQuery.data ?? [];
  const errorMessage =
    formError ??
    (addMutation.error instanceof Error ? addMutation.error.message : null) ??
    (removeMutation.error instanceof Error ? removeMutation.error.message : null);

  return (
    <main>
      <nav className="top-nav" aria-label="User">
        <Link href="/">Dashboard</Link>
        <span>{user?.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </nav>

      <header>
        <p className="eyebrow">Watchlist</p>
        <h1>Tracked Stocks</h1>
        <p className="subtitle">
          Add ticker symbols to keep a persistent list for future analysis and
          scheduled updates.
        </p>
      </header>

      <section aria-labelledby="add-ticker-heading" className="watchlist-panel">
        <h2 id="add-ticker-heading">Add ticker</h2>
        <form className="watchlist-form" onSubmit={onSubmit}>
          <label htmlFor="ticker">Ticker</label>
          <input
            id="ticker"
            name="ticker"
            placeholder="AAPL"
            value={ticker}
            onChange={(event) => {
              setTicker(event.target.value);
              setFormError(null);
            }}
            autoComplete="off"
            disabled={addMutation.isPending}
          />
          <button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add"}
          </button>
        </form>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>

      <section aria-labelledby="watchlist-heading">
        <h2 id="watchlist-heading">Your watchlist</h2>

        {watchlistQuery.isLoading ? (
          <p>Loading watchlist...</p>
        ) : watchlistQuery.error instanceof Error ? (
          <p className="error-text">{watchlistQuery.error.message}</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <strong>No stocks yet</strong>
            <p>Add a ticker to start building your watchlist.</p>
          </div>
        ) : (
          <div className="watchlist-list">
            {items.map((item) => (
              <article className="quote-card watchlist-item" key={item.id}>
                <div>
                  <strong>{item.ticker}</strong>
                  <p>{item.companyName ?? "Company name not set"}</p>
                  <small>Added {new Date(item.createdAt).toLocaleDateString()}</small>
                </div>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={
                    removeMutation.isPending &&
                    removeMutation.variables === item.id
                  }
                >
                  {removeMutation.isPending &&
                  removeMutation.variables === item.id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
