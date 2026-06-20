"use client";

import type { AppleLoginRequest } from "@ai-stock-advisor/shared";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AppleProviderIcon,
  SocialAuthButton,
} from "./AuthorizationUI";
import { useAuth } from "./AuthProvider";

interface AppleSignInResponse {
  authorization?: {
    code?: string;
    id_token?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

interface AppleAuthClient {
  auth: {
    init: (options: {
      clientId: string;
      scope: string;
      redirectURI: string;
      usePopup: boolean;
    }) => void;
    signIn: () => Promise<AppleSignInResponse>;
  };
}

declare global {
  interface Window {
    AppleID?: AppleAuthClient;
  }
}

export function AppleSignInButton() {
  const router = useRouter();
  const { loginWithProvider } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

  const getRedirectUri = useCallback(() => {
    return (
      process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ??
      `${window.location.origin}/login`
    );
  }, []);

  const initializeApple = useCallback(() => {
    if (!clientId || !window.AppleID) {
      return;
    }

    window.AppleID.auth.init({
      clientId,
      scope: "name email",
      redirectURI: getRedirectUri(),
      usePopup: true,
    });
  }, [clientId, getRedirectUri]);

  useEffect(() => {
    initializeApple();
  }, [initializeApple]);

  const handleAppleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!clientId) {
      setError("Apple login is not configured.");
      return;
    }

    if (!window.AppleID) {
      setError("Apple login is still loading. Please try again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      initializeApple();
      const response = await window.AppleID.auth.signIn();
      const identityToken = response.authorization?.id_token;

      if (!identityToken) {
        throw new Error("Missing Apple identity token");
      }

      const payload: AppleLoginRequest = {
        identityToken,
        ...(response.authorization?.code
          ? { authorizationCode: response.authorization.code }
          : {}),
        user: {
          email: response.user?.email,
          firstName: response.user?.name?.firstName,
          lastName: response.user?.name?.lastName,
        },
      };

      await loginWithProvider("apple", payload);
      router.replace("/");
    } catch (caughtError) {
      setError(getAppleLoginErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apple-sign-in">
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
        onLoad={initializeApple}
      />
      <SocialAuthButton
        className="auth-social-button-apple"
        disabled={isSubmitting}
        icon={<AppleProviderIcon />}
        provider={isSubmitting ? "Signing in with Apple..." : "Continue with Apple"}
        onClick={handleAppleLogin}
      />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

function getAppleLoginErrorMessage(error: unknown): string {
  if (isAppleCancelledError(error)) {
    return "Apple login was cancelled.";
  }

  return "Apple login failed. Please try again.";
}

function isAppleCancelledError(error: unknown): boolean {
  if (typeof error === "string") {
    return error.toLowerCase().includes("cancel");
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("cancel") || message.includes("popup");
}
