import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { TransactionsPage } from "./TransactionsPage";

export default function Transactions() {
  return (
    <ProtectedRoute>
      <TransactionsPage />
    </ProtectedRoute>
  );
}
