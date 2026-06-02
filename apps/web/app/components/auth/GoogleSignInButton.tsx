"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

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
  const { loginWithGoogleCredential } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initializeGoogleButton = () => {
    if (!clientId || !window.google || !buttonRef.current) {
      setError("Google sign-in is not configured.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          setError("Google did not return a sign-in credential.");
          return;
        }

        setError(null);
        setIsSubmitting(true);
        loginWithGoogleCredential(response.credential)
          .then(() => {
            router.replace("/");
          })
          .catch(() => {
            setError("Google sign-in failed. Check the API configuration.");
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
      {isSubmitting ? <p>Signing in...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
