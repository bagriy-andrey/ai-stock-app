"use client";

import type {
  AppleLoginRequest,
  AuthProviderFlags,
  AuthUser,
  ConnectedAccountsResponse,
  FacebookLoginRequest,
  UserDto,
} from "@ai-stock-advisor/shared";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../components/auth/AuthProvider";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import {
  linkApple,
  linkFacebook,
  linkGoogle,
} from "../lib/auth-api";

interface GoogleCredentialResponse {
  credential?: string;
}

interface FacebookAuthResponse {
  accessToken?: string;
}

interface FacebookLoginResponse {
  status?: "connected" | "not_authorized" | "unknown";
  authResponse?: FacebookAuthResponse;
}

interface ConnectedAccountsSectionProps {
  className?: string;
  connectedAccounts?: ConnectedAccountsResponse;
  heading?: string;
  profile: UserDto;
  subheading?: string;
  onLinked: (user: AuthUser) => void;
}

type LinkableProvider = "google" | "apple" | "facebook";

const linkableProviders: Array<{
  key: LinkableProvider;
  label: string;
}> = [
  { key: "google", label: "Google" },
  { key: "apple", label: "Apple" },
  { key: "facebook", label: "Facebook" },
];

export function ConnectedAccountsSection({
  className,
  connectedAccounts,
  heading = "Security",
  profile,
  subheading = "Connected accounts",
  onLinked,
}: ConnectedAccountsSectionProps) {
  const { accessToken } = useAuth();
  const [linkingProvider, setLinkingProvider] = useState<LinkableProvider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  const providers = useMemo(
    () => buildProviderFlags(profile, connectedAccounts),
    [connectedAccounts, profile],
  );

  const handleLinkedUser = useCallback(
    (provider: LinkableProvider, user: AuthUser) => {
      onLinked(user);
      setError(null);
      setSuccess(`${getProviderLabel(provider)} connected.`);
    },
    [onLinked],
  );

  const handleGoogleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!accessToken || !response.credential) {
        setError("Google did not return a link credential.");
        return;
      }

      setError(null);
      setSuccess(null);
      setLinkingProvider("google");

      try {
        const result = await linkGoogle(accessToken, response.credential);
        handleLinkedUser("google", result.user);
      } catch (caughtError) {
        setError(getLinkErrorMessage("google", caughtError));
      } finally {
        setLinkingProvider(null);
      }
    },
    [accessToken, handleLinkedUser],
  );

  const initializeGoogle = useCallback(() => {
    if (!googleClientId || !window.google) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        void handleGoogleCredential(response);
      },
    });
  }, [googleClientId, handleGoogleCredential]);

  const initializeApple = useCallback(() => {
    if (!appleClientId || !window.AppleID) {
      return;
    }

    window.AppleID.auth.init({
      clientId: appleClientId,
      scope: "name email",
      redirectURI:
        process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI ?? window.location.origin,
      usePopup: true,
    });
  }, [appleClientId]);

  const initializeFacebook = useCallback(() => {
    if (!facebookAppId || !window.FB) {
      return;
    }

    window.FB.init({
      appId: facebookAppId,
      cookie: false,
      xfbml: false,
      version: "v20.0",
    });
  }, [facebookAppId]);

  useEffect(() => {
    initializeGoogle();
  }, [initializeGoogle]);

  useEffect(() => {
    initializeApple();
  }, [initializeApple]);

  useEffect(() => {
    initializeFacebook();
  }, [initializeFacebook]);

  const linkWithGoogle = () => {
    if (!googleClientId) {
      setError("Google linking is not configured.");
      return;
    }

    if (!window.google?.accounts.id.prompt) {
      setError("Google linking is still loading. Please try again.");
      return;
    }

    setError(null);
    setSuccess(null);
    initializeGoogle();
    window.google.accounts.id.prompt();
  };

  const linkWithApple = async () => {
    if (!accessToken) {
      setError("Sign in again before connecting Apple.");
      return;
    }

    if (!appleClientId) {
      setError("Apple linking is not configured.");
      return;
    }

    if (!window.AppleID) {
      setError("Apple linking is still loading. Please try again.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLinkingProvider("apple");

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
      const result = await linkApple(accessToken, payload);
      handleLinkedUser("apple", result.user);
    } catch (caughtError) {
      setError(getLinkErrorMessage("apple", caughtError));
    } finally {
      setLinkingProvider(null);
    }
  };

  const linkWithFacebook = async () => {
    if (!accessToken) {
      setError("Sign in again before connecting Facebook.");
      return;
    }

    if (!facebookAppId) {
      setError("Facebook linking is not configured.");
      return;
    }

    if (!window.FB) {
      setError("Facebook linking is still loading. Please try again.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLinkingProvider("facebook");

    try {
      initializeFacebook();
      const response = await loginWithFacebookSdk();
      const accessTokenFromFacebook = response.authResponse?.accessToken;

      if (response.status !== "connected" || !accessTokenFromFacebook) {
        throw new Error("Facebook linking was cancelled.");
      }

      const payload: FacebookLoginRequest = {
        accessToken: accessTokenFromFacebook,
      };
      const result = await linkFacebook(accessToken, payload);
      handleLinkedUser("facebook", result.user);
    } catch (caughtError) {
      setError(getLinkErrorMessage("facebook", caughtError));
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <h2>{heading}</h2>
        <p>{subheading}</p>
      </CardHeader>
      <CardContent>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initializeGoogle}
        />
        <Script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          strategy="afterInteractive"
          onLoad={initializeApple}
        />
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onLoad={initializeFacebook}
        />

        <div className="connected-accounts-list">
          {linkableProviders.map((provider) => (
            <ConnectedProviderRow
              key={provider.key}
              isConnected={providers[provider.key]}
              isLinking={linkingProvider === provider.key}
              label={provider.label}
              onConnect={
                provider.key === "google"
                  ? linkWithGoogle
                  : provider.key === "apple"
                    ? () => void linkWithApple()
                    : () => void linkWithFacebook()
              }
            />
          ))}
          <ConnectedProviderRow
            isConnected={providers.email}
            label="Email"
          />
          <ConnectedProviderRow
            isConnected={providers.phone}
            label="Phone"
          />
        </div>
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {success ? <p className="success-text" role="status">{success}</p> : null}
      </CardContent>
    </Card>
  );
}

function ConnectedProviderRow({
  isConnected,
  isLinking = false,
  label,
  onConnect,
}: {
  isConnected: boolean;
  isLinking?: boolean;
  label: string;
  onConnect?: () => void;
}) {
  return (
    <div className="connected-account-row">
      <div>
        <strong>{label}</strong>
        <span
          className={
            isConnected
              ? "connected-account-status connected"
              : "connected-account-status"
          }
        >
          {isConnected ? "Connected" : "Not connected"}
        </span>
      </div>
      {!isConnected && onConnect ? (
        <Button
          type="button"
          variant="outline"
          disabled={isLinking}
          onClick={onConnect}
        >
          {isLinking ? "Connecting..." : `Connect ${label}`}
        </Button>
      ) : null}
    </div>
  );
}

function buildProviderFlags(
  profile: UserDto,
  connectedAccounts: ConnectedAccountsResponse | undefined,
): AuthProviderFlags {
  const providers = connectedAccounts?.providers ?? profile.authProviders;

  return {
    google: providers.google,
    apple: providers.apple,
    facebook: providers.facebook,
    email: providers.email || profile.authProviders.email,
    phone: providers.phone || Boolean(profile.phoneNumber),
  };
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

function getProviderLabel(provider: LinkableProvider): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function getLinkErrorMessage(provider: LinkableProvider, error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("provider email")) {
    return "This provider email is already associated with another account.";
  }

  if (
    message.includes("another user") ||
    message.includes("already connected") ||
    message.includes("already linked")
  ) {
    return `This ${getProviderLabel(provider)} account is already connected to another user.`;
  }

  if (provider === "apple" && message.toLowerCase().includes("cancel")) {
    return "Apple linking was cancelled.";
  }

  if (provider === "facebook" && message.toLowerCase().includes("cancel")) {
    return "Facebook linking was cancelled.";
  }

  return `${getProviderLabel(provider)} linking failed. Please try again.`;
}
