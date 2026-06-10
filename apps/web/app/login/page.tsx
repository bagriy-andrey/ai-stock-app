"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AppleProviderIcon,
  AuthCard,
  AuthDivider,
  AuthFeatureIcon,
  AuthLayout,
  AuthModeSwitch,
  FacebookProviderIcon,
  PasswordInput,
  SocialAuthButton,
} from "../components/auth/AuthorizationUI";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { useAuth } from "../components/auth/AuthProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  type AuthMode,
  type LoginFormErrors,
  type SignupFormErrors,
  hasFormErrors,
  validateLoginForm,
  validateSignupForm,
} from "../lib/auth-form-validation";

const initialLoginErrors: LoginFormErrors = {};
const initialSignupErrors: SignupFormErrors = {};

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loginErrors, setLoginErrors] = useState<LoginFormErrors>(initialLoginErrors);
  const [signupErrors, setSignupErrors] =
    useState<SignupFormErrors>(initialSignupErrors);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setStatusMessage(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const updateMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLoginErrors(initialLoginErrors);
    setSignupErrors(initialSignupErrors);
    setStatusMessage(null);
  };

  const showComingSoon = (message: string) => {
    setStatusMessage(message);
  };

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm({ identifier, password });
    setLoginErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      return;
    }

    showComingSoon("Email, phone and nickname login is coming soon");
  };

  const handleSignupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateSignupForm({
      email,
      nickname,
      password,
      confirmPassword,
    });
    setSignupErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      return;
    }

    showComingSoon("Email sign up is coming soon");
  };

  const isSignup = mode === "signup";

  return (
    <AuthLayout mode={mode}>
      <AuthCard
        description={
          isSignup
            ? "Create your AI Stock Advisor account to track portfolios, follow stocks and unlock AI-powered investment insights."
            : "Welcome back. Log in to manage your watchlist, portfolio and AI market insights."
        }
        eyebrow={isSignup ? "Create your workspace" : "Secure access"}
        title={isSignup ? "Create your account" : "Log in to AI Stock Advisor"}
      >
        <div className="auth-social-stack">
          <div className="auth-google-button-shell">
            <GoogleSignInButton text="continue_with" />
          </div>
          <SocialAuthButton
            icon={<AppleProviderIcon />}
            provider="Continue with Apple"
            statusLabel="Coming soon"
            onClick={() => showComingSoon("Apple login is coming soon")}
          />
          <SocialAuthButton
            icon={<FacebookProviderIcon />}
            provider="Continue with Facebook"
            statusLabel="Coming soon"
            onClick={() => showComingSoon("Facebook login is coming soon")}
          />
        </div>

        <AuthDivider
          label={isSignup ? "or create account with email" : "or continue with"}
        />

        {isSignup ? (
          <form className="auth-form" noValidate onSubmit={handleSignupSubmit}>
            <AuthTextField
              autoComplete="email"
              error={signupErrors.email}
              id="signup-email"
              label="Email"
              name="email"
              onChange={setEmail}
              placeholder="Email"
              type="email"
              value={email}
            />
            <AuthTextField
              autoComplete="nickname"
              error={signupErrors.nickname}
              id="signup-nickname"
              label="Nickname"
              name="nickname"
              onChange={setNickname}
              placeholder="Nickname"
              value={nickname}
            />
            <PasswordInput
              autoComplete="new-password"
              error={signupErrors.password}
              id="signup-password"
              isVisible={isPasswordVisible}
              label="Password"
              name="password"
              onChange={setPassword}
              onVisibilityChange={setIsPasswordVisible}
              placeholder="Password"
              value={password}
            />
            <PasswordInput
              autoComplete="new-password"
              error={signupErrors.confirmPassword}
              id="signup-confirm-password"
              isVisible={isConfirmPasswordVisible}
              label="Confirm password"
              name="confirmPassword"
              onChange={setConfirmPassword}
              onVisibilityChange={setIsConfirmPasswordVisible}
              placeholder="Confirm password"
              value={confirmPassword}
            />
            <Button className="auth-primary-button" type="submit">
              Create Account
            </Button>
          </form>
        ) : (
          <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
            <AuthTextField
              autoComplete="username"
              error={loginErrors.identifier}
              id="login-identifier"
              label="Email, phone or nickname"
              name="identifier"
              onChange={setIdentifier}
              placeholder="Email, phone or nickname"
              value={identifier}
            />
            <PasswordInput
              autoComplete="current-password"
              error={loginErrors.password}
              id="login-password"
              isVisible={isPasswordVisible}
              label="Password"
              name="password"
              onChange={setPassword}
              onVisibilityChange={setIsPasswordVisible}
              placeholder="Password"
              value={password}
            />
            <div className="auth-form-row">
              <Link href="/auth/forgot-password">Forgot password?</Link>
            </div>
            <Button className="auth-primary-button" type="submit">
              Log In
            </Button>
          </form>
        )}

        <div className="auth-feature-list" aria-label="Upcoming authorization options">
          <span>
            <AuthFeatureIcon type="mail" />
            Email
          </span>
          <span>
            <AuthFeatureIcon type="phone" />
            Phone
          </span>
          <span>
            <AuthFeatureIcon type="secure" />
            2FA soon
          </span>
        </div>

        <AuthModeSwitch mode={mode} onModeChange={updateMode} />
      </AuthCard>

      {statusMessage ? (
        <p className="app-toast auth-toast" role="status">
          {statusMessage}
        </p>
      ) : null}
    </AuthLayout>
  );
}

interface AuthTextFieldProps {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "email" | "text";
  value: string;
}

function AuthTextField({
  autoComplete,
  error,
  id,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: AuthTextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        id={id}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
