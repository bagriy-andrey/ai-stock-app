import { Suspense } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { PortfolioPage } from "./PortfolioPage";

export default function Portfolio() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <PortfolioPage />
      </Suspense>
    </ProtectedRoute>
  );
}
