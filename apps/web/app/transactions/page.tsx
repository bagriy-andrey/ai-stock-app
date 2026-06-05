import { Suspense } from "react";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { TransactionsPage } from "./TransactionsPage";

export default function Transactions() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <TransactionsPage />
      </Suspense>
    </ProtectedRoute>
  );
}
