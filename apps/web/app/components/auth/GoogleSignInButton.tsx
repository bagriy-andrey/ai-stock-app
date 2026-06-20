"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleProviderIcon,
  SocialAuthButton,
} from "./AuthorizationUI";
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
      prompt?: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

interface GoogleSignInButtonProps {
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}

export function GoogleSignInButton({
  text = "continue_with",
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isButtonReady, setIsButtonReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const initializeGoogleButton = useCallback(() => {
    if (!clientId) {
      setError(t.googleNotConfigured);
      setIsButtonReady(false);
      return;
    }

    if (!window.google || !buttonRef.current) {
      setIsButtonReady(false);
      return;
    }

    buttonRef.current.innerHTML = "";
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
      width: Math.min(buttonRef.current.clientWidth || 400, 400),
      text,
    });
    setIsButtonReady(true);
  }, [clientId, loginWithGoogle, router, t, text]);

  useEffect(() => {
    initializeGoogleButton();
  }, [initializeGoogleButton]);

  return (
    <div className="google-sign-in">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogleButton}
      />
      <div className="google-sign-in-control">
        <SocialAuthButton
          className="auth-social-button-google"
          disabled={!clientId || isSubmitting}
          icon={<GoogleProviderIcon />}
          provider={isSubmitting ? t.signingIn : "Continue with Google"}
          onClick={() => {
            if (!clientId) {
              setError(t.googleNotConfigured);
              return;
            }

            if (!isButtonReady) {
              setError("Google login is still loading. Please try again.");
              return;
            }

            window.google?.accounts.id.prompt?.();
          }}
        />
        <div
          ref={buttonRef}
          aria-hidden="true"
          className="google-sign-in-native"
          data-ready={isButtonReady && !isSubmitting ? "true" : "false"}
        />
      </div>
      {isSubmitting ? <p>{t.signingIn}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
