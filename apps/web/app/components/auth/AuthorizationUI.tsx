"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, Smartphone } from "lucide-react";
import type { AuthMode } from "../../lib/auth-form-validation";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface AuthLayoutProps {
  children: ReactNode;
  mode: AuthMode;
}

interface AuthCardProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

interface AuthDividerProps {
  label: string;
}

interface AuthModeSwitchProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

interface PasswordInputProps {
  autoComplete: string;
  error?: string;
  id: string;
  isVisible: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  onVisibilityChange: (isVisible: boolean) => void;
  placeholder: string;
  value: string;
}

interface SocialAuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  provider: string;
  statusLabel?: string;
}

export function AuthLayout({ children, mode }: AuthLayoutProps) {
  const isSignup = mode === "signup";

  return (
    <main className="auth-screen" data-auth-mode={mode}>
      <section className="auth-shell" aria-label="Authorization">
        <aside className="auth-visual-panel" aria-label="AI Stock Advisor overview">
          <Link className="auth-brand" href="/" aria-label="AI Stock Advisor home page">
            <span className="auth-brand-mark" aria-hidden="true">
              A
            </span>
            <span>
              <strong>AI Stock Advisor</strong>
              <small>AI-powered market workspace</small>
            </span>
          </Link>
          <div className="auth-visual-copy">
            <p className="eyebrow">Fintech intelligence</p>
            <h2>
              {isSignup
                ? "Start tracking smarter market decisions."
                : "Your market command center is ready."}
            </h2>
            <p>
              {isSignup
                ? "Track your portfolio, follow stocks and get AI-powered investment insights."
                : "Log in to manage your watchlist, portfolio and AI market insights."}
            </p>
          </div>
          <div className="auth-insight-card">
            <div>
              <small>AI signal</small>
              <strong>Portfolio risk scan</strong>
            </div>
            <span>Live soon</span>
          </div>
          <div className="auth-metrics-grid" aria-hidden="true">
            <span>Watchlist</span>
            <span>Portfolio</span>
            <span>Insights</span>
          </div>
        </aside>
        <div className="auth-panel">{children}</div>
      </section>
    </main>
  );
}

export function AuthCard({ children, description, eyebrow, title }: AuthCardProps) {
  return (
    <Card className="auth-card">
      <CardContent className="auth-card-content">
        <div className="auth-card-header">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="auth-divider" role="separator" aria-label={label}>
      <span aria-hidden="true" />
      <p>{label}</p>
      <span aria-hidden="true" />
    </div>
  );
}

export function AuthModeSwitch({ mode, onModeChange }: AuthModeSwitchProps) {
  const isSignup = mode === "signup";

  return (
    <p className="auth-mode-switch">
      {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
      <button
        type="button"
        onClick={() => onModeChange(isSignup ? "login" : "signup")}
      >
        {isSignup ? "Log in" : "Sign up"}
      </button>
    </p>
  );
}

export function PasswordInput({
  autoComplete,
  error,
  id,
  isVisible,
  label,
  name,
  onChange,
  onVisibilityChange,
  placeholder,
  value,
}: PasswordInputProps) {
  const errorId = `${id}-error`;

  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="auth-password-shell">
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          id={id}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={
            isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
          }
          className="auth-password-toggle"
          type="button"
          onClick={() => onVisibilityChange(!isVisible)}
        >
          {isVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error ? (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SocialAuthButton({
  className = "",
  icon,
  provider,
  statusLabel,
  ...props
}: SocialAuthButtonProps) {
  return (
    <Button
      {...props}
      className={`auth-social-button ${className}`.trim()}
      type="button"
      variant="outline"
    >
      <span className="auth-social-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{provider}</span>
      {statusLabel ? <small>{statusLabel}</small> : null}
    </Button>
  );
}

export function GoogleProviderIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Google">
      <path
        d="M21.6 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.37a4.59 4.59 0 0 1-1.99 3.01v2.5h3.22c1.89-1.74 3-4.31 3-7.46Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.96-.9 6.61-2.31l-3.22-2.5c-.89.6-2.03.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.08v2.58A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 14.02A6.01 6.01 0 0 1 6.1 12c0-.7.11-1.39.31-2.02V7.4H3.08A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.08 4.6l3.33-2.58Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.86c1.47 0 2.78.5 3.82 1.49l2.86-2.86C16.95 2.88 14.7 2 12 2a9.99 9.99 0 0 0-8.92 5.4l3.33 2.58C7.2 7.62 9.4 5.86 12 5.86Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AppleProviderIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Apple">
      <path
        d="M16.2 13.07c-.03-2.7 2.22-4 2.32-4.06-1.28-1.86-3.22-2.12-3.9-2.15-1.64-.17-3.23.98-4.06.98-.85 0-2.14-.96-3.52-.93-1.78.03-3.44 1.06-4.35 2.69-1.88 3.25-.48 8.03 1.32 10.66.9 1.29 1.94 2.73 3.32 2.68 1.35-.05 1.85-.86 3.47-.86 1.61 0 2.08.86 3.49.83 1.45-.02 2.36-1.3 3.22-2.6 1.04-1.48 1.45-2.94 1.47-3.02-.03-.01-2.75-1.05-2.78-4.22ZM13.55 5.12c.72-.9 1.21-2.12 1.08-3.36-1.04.05-2.34.72-3.08 1.6-.66.78-1.25 2.05-1.1 3.24 1.17.09 2.35-.59 3.1-1.48Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FacebookProviderIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Facebook">
      <path
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.08 5.66 21.25 10.44 22v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.5-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47H15.2c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22A10.03 10.03 0 0 0 22 12.06Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AuthFeatureIcon({ type }: { type: "mail" | "phone" | "secure" }) {
  const icons = {
    mail: <Mail aria-hidden="true" />,
    phone: <Smartphone aria-hidden="true" />,
    secure: <LockKeyhole aria-hidden="true" />,
  };

  return <span className="auth-feature-icon">{icons[type]}</span>;
}
