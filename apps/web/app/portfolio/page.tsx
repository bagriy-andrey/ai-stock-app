import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PortfolioPage } from "./PortfolioPage";

export default function Portfolio() {
  return (
    <ProtectedRoute>
      <PortfolioPage />
    </ProtectedRoute>
  );
}
