"use client";

import type { FacebookLoginRequest } from "@ai-stock-advisor/shared";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FacebookProviderIcon,
  SocialAuthButton,
} from "./AuthorizationUI";
import { useAuth } from "./AuthProvider";

interface FacebookAuthResponse {
  accessToken?: string;
  expiresIn?: number;
  signedRequest?: string;
  userID?: string;
}

interface FacebookLoginResponse {
  status?: "connected" | "not_authorized" | "unknown";
  authResponse?: FacebookAuthResponse;
}

interface FacebookSdk {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: { scope: string },
  ) => void;
}

declare global {
  interface Window {
    FB?: FacebookSdk;
  }
}

export function FacebookSignInButton() {
  const router = useRouter();
  const { loginWithProvider } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const initializeFacebook = useCallback(() => {
    if (!clientId || !window.FB) {
      return;
    }

    window.FB.init({
      appId: clientId,
      cookie: false,
      xfbml: false,
      version: "v20.0",
    });
  }, [clientId]);

  useEffect(() => {
    initializeFacebook();
  }, [initializeFacebook]);

  const handleFacebookLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!clientId) {
      setError("Facebook login is not configured.");
      return;
    }

    if (!window.FB) {
      setError("Facebook login is still loading. Please try again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      initializeFacebook();
      const response = await loginWithFacebookSdk();
      const accessToken = response.authResponse?.accessToken;

      if (response.status !== "connected" || !accessToken) {
        throw new FacebookLoginCancelledError();
      }

      const payload: FacebookLoginRequest = { accessToken };
      await loginWithProvider("facebook", payload);
      router.replace("/");
    } catch (caughtError) {
      setError(getFacebookLoginErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="facebook-sign-in">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        onLoad={initializeFacebook}
      />
      <SocialAuthButton
        className="auth-social-button-facebook"
        disabled={isSubmitting}
        icon={<FacebookProviderIcon />}
        provider={
          isSubmitting ? "Signing in with Facebook..." : "Continue with Facebook"
        }
        onClick={handleFacebookLogin}
      />
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

function loginWithFacebookSdk(): Promise<FacebookLoginResponse> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error("Facebook SDK is not available"));
      return;
    }

    window.FB.login(resolve, {
      scope: "email,public_profile",
    });
  });
}

function getFacebookLoginErrorMessage(error: unknown): string {
  if (error instanceof FacebookLoginCancelledError) {
    return "Facebook login was cancelled.";
  }

  return "Facebook login failed. Please try again.";
}

class FacebookLoginCancelledError extends Error {
  constructor() {
    super("Facebook login was cancelled");
  }
}
