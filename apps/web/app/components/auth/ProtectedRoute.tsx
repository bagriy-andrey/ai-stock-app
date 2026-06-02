"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useI18n } from "../i18n/I18nProvider";

export function ProtectedRoute({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { status } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <main className="centered-screen">
        <p>{t.loadingSession}</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return children;
}
