import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { ProfilePage } from "./ProfilePage";

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}
