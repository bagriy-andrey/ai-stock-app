"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useI18n } from "../i18n/I18nProvider";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccounts {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          theme: "outline" | "filled_blue" | "filled_black";
          size: "large" | "medium" | "small";
          width: number;
          text: "signin_with" | "signup_with" | "continue_with" | "signin";
        },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export function GoogleSignInButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initializeGoogleButton = () => {
    if (!clientId || !window.google || !buttonRef.current) {
      setError(t.googleNotConfigured);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          setError(t.googleMissingCredential);
          return;
        }

        setError(null);
        setIsSubmitting(true);
        loginWithGoogle(response.credential)
          .then(() => {
            router.replace("/");
          })
          .catch(() => {
            setError(t.googleSignInFailed);
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      },
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with",
    });
  };

  return (
    <div className="google-sign-in">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleButton}
      />
      <div ref={buttonRef} aria-hidden={isSubmitting} />
      {isSubmitting ? <p>{t.signingIn}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
