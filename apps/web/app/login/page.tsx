"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { useAuth } from "../components/auth/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-heading">
        <p className="eyebrow">Secure access</p>
        <h1 id="login-heading">AI Stock Advisor</h1>
        <p className="subtitle">
          Sign in with Google to open your stock advisor dashboard.
        </p>
        <GoogleSignInButton />
      </section>
    </main>
  );
}
