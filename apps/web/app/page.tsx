import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Dashboard } from "./Dashboard";

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
