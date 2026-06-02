"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { useAuth } from "../components/auth/AuthProvider";
import { useI18n } from "../components/i18n/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-heading">
        <p className="eyebrow">{t.secureAccess}</p>
        <h1 id="login-heading">AI Stock Advisor</h1>
        <p className="subtitle">{t.loginSubtitle}</p>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
