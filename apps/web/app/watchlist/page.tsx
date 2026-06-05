import { Suspense } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { WatchlistPage } from "./WatchlistPage";

export default function Watchlist() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <WatchlistPage />
      </Suspense>
    </ProtectedRoute>
  );
}
