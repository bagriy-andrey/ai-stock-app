"use client";

import type {
  AuthProviderFlags,
  AuthUser,
  ConnectedAccountsResponse,
  UserDto,
} from "@ai-stock-advisor/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AppHeader } from "../../components/layout/AppHeader";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { fetchConnectedAccounts } from "../../lib/auth-api";
import { fetchProfile } from "../../lib/profile-api";
import { useAuth } from "../../components/auth/AuthProvider";
import { ConnectedAccountsSection } from "../ConnectedAccountsSection";
import { ProfileNavigation } from "../ProfileNavigation";

const profileQueryKey = ["profile"] as const;
const connectedAccountsQueryKey = ["connected-accounts"] as const;

interface SecuritySettingsContentProps {
  connectedAccounts?: ConnectedAccountsResponse;
  connectedAccountsError?: boolean;
  connectedAccountsLoading?: boolean;
  onLinked: (user: AuthUser) => void;
  onRetryConnectedAccounts?: () => void;
  profile: UserDto;
}

export function SecurityPage() {
  const queryClient = useQueryClient();
  const { accessToken, updateUser } = useAuth();

  const profileQuery = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => fetchProfile(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });
  const connectedAccountsQuery = useQuery({
    queryKey: connectedAccountsQueryKey,
    queryFn: () => fetchConnectedAccounts(accessToken ?? ""),
    enabled: Boolean(accessToken),
  });

  const profile = profileQuery.data;

  const handleLinked = (user: AuthUser) => {
    if (profile) {
      queryClient.setQueryData<UserDto>(profileQueryKey, {
        ...profile,
        ...user,
      });
      queryClient.setQueryData<ConnectedAccountsResponse>(
        connectedAccountsQueryKey,
        toConnectedAccountsSnapshot(user, profile),
      );
    }

    updateUser(user);
    void queryClient.invalidateQueries({ queryKey: connectedAccountsQueryKey });
    void queryClient.invalidateQueries({ queryKey: profileQueryKey });
  };

  return (
    <main>
      <AppHeader />

      <header className="page-header">
        <p className="eyebrow">Account settings</p>
        <h1>Security</h1>
        <p className="subtitle">
          Review sign-in methods, account protection, and recovery options.
        </p>
        <ProfileNavigation />
      </header>

      {profileQuery.isLoading ? (
        <SecurityPageLoading />
      ) : profileQuery.error instanceof Error ? (
        <ProfileSecurityError onRetry={() => void profileQuery.refetch()} />
      ) : profile ? (
        <SecuritySettingsContent
          connectedAccounts={connectedAccountsQuery.data}
          connectedAccountsError={connectedAccountsQuery.error instanceof Error}
          connectedAccountsLoading={connectedAccountsQuery.isLoading}
          onLinked={handleLinked}
          onRetryConnectedAccounts={() => void connectedAccountsQuery.refetch()}
          profile={profile}
        />
      ) : null}
    </main>
  );
}

export function SecuritySettingsContent({
  connectedAccounts,
  connectedAccountsError = false,
  connectedAccountsLoading = false,
  onLinked,
  onRetryConnectedAccounts,
  profile,
}: SecuritySettingsContentProps) {
  const providers = connectedAccounts?.providers ?? profile.authProviders;
  const passwordEnabled = hasPasswordSignIn(providers);

  return (
    <div className="security-layout">
      {connectedAccountsLoading ? (
        <SecurityLoadingCard
          heading="Sign-in methods"
          lineCount={5}
          subheading="Loading connected accounts..."
        />
      ) : connectedAccountsError ? (
        <Card>
          <CardHeader>
            <h2>Sign-in methods</h2>
            <p>Connected accounts</p>
          </CardHeader>
          <CardContent>
            <div className="security-alert" role="alert">
              <strong>Connected accounts could not be loaded.</strong>
              <span>Retry to refresh your sign-in method status.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRetryConnectedAccounts}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ConnectedAccountsSection
          className="security-connected-card"
          connectedAccounts={connectedAccounts}
          heading="Sign-in methods"
          profile={profile}
          subheading="Manage connected accounts and password-based sign-in options."
          onLinked={onLinked}
        />
      )}

      <PasswordSecuritySection enabled={passwordEnabled} />
      <TwoFactorSection enabled={profile.twoFactorEnabled} />
      <AccountRecoverySection />
      <SessionsSection />
    </div>
  );
}

function PasswordSecuritySection({ enabled }: { enabled: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="security-card-title-row">
          <div>
            <h2>Password</h2>
            <p>Password-based sign-in status</p>
          </div>
          <SecurityStatusBadge connected={enabled}>
            {enabled ? "Enabled" : "Not set"}
          </SecurityStatusBadge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="security-section-body">
          <p>
            {enabled
              ? "You can use email, nickname or phone number with your password to sign in."
              : "Password sign-in is not enabled for this account yet."}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled
            aria-label={`${enabled ? "Change" : "Set"} password, coming soon`}
          >
            {enabled ? "Change password" : "Set password"} - Coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TwoFactorSection({ enabled }: { enabled: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="security-card-title-row">
          <div>
            <h2>Two-factor authentication</h2>
            <p>Additional sign-in protection</p>
          </div>
          <SecurityStatusBadge connected={enabled}>
            {enabled ? "Enabled" : "Disabled"}
          </SecurityStatusBadge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="security-section-body">
          <p>
            Authenticator app setup will be available in an upcoming security
            task.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled
            aria-label={`${enabled ? "Manage" : "Set up"} 2FA, coming soon`}
          >
            {enabled ? "Manage 2FA" : "Set up 2FA"} - Coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountRecoverySection() {
  return (
    <Card>
      <CardHeader>
        <h2>Account recovery</h2>
        <p>Recovery options</p>
      </CardHeader>
      <CardContent>
        <div className="security-info-list">
          <p>
            Password reset is available for accounts with email/password
            sign-in.
          </p>
          <p>Recovery codes will be available after 2FA setup.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionsSection() {
  return (
    <Card>
      <CardHeader>
        <h2>Sessions</h2>
        <p>Active session management</p>
      </CardHeader>
      <CardContent>
        <div className="security-section-body">
          <p>Session management will be added after the MVP auth flows settle.</p>
          <Button
            type="button"
            variant="outline"
            disabled
            aria-label="Manage sessions, coming soon"
          >
            Manage sessions - Coming soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityStatusBadge({
  children,
  connected,
}: {
  children: ReactNode;
  connected: boolean;
}) {
  return (
    <span className={connected ? "security-badge connected" : "security-badge"}>
      {children}
    </span>
  );
}

function SecurityPageLoading() {
  return (
    <div className="security-layout">
      <SecurityLoadingCard
        heading="Security settings"
        lineCount={4}
        subheading="Loading security settings..."
      />
    </div>
  );
}

function SecurityLoadingCard({
  heading,
  lineCount,
  subheading,
}: {
  heading: string;
  lineCount: number;
  subheading: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h2>{heading}</h2>
        <p role="status">{subheading}</p>
      </CardHeader>
      <CardContent>
        <div className="security-skeleton" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSecurityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="security-layout">
      <Card>
        <CardHeader>
          <h2>Security settings</h2>
          <p>Profile data is required to load security settings.</p>
        </CardHeader>
        <CardContent>
          <div className="security-alert" role="alert">
            <strong>Security settings could not be loaded.</strong>
            <span>Retry after checking your connection.</span>
          </div>
          <Button type="button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function hasPasswordSignIn(providers: AuthProviderFlags): boolean {
  return providers.email || providers.phone;
}

export function toConnectedAccountsSnapshot(
  user: AuthUser,
  profile: UserDto,
): ConnectedAccountsResponse {
  return {
    providers: user.authProviders,
    email: user.email,
    emailVerified: profile.emailVerified,
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
  };
}
