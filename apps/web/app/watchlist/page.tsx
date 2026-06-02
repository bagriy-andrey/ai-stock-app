import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { WatchlistPage } from "./WatchlistPage";

export default function Watchlist() {
  return (
    <ProtectedRoute>
      <WatchlistPage />
    </ProtectedRoute>
  );
}
