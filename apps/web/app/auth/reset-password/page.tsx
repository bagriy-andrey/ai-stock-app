"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import {
  AuthCard,
  AuthLayout,
  PasswordInput,
} from "../../components/auth/AuthorizationUI";
import { Button } from "../../components/ui/button";
import { resetPassword } from "../../lib/auth-api";
import {
  type ResetPasswordFormErrors,
  validateResetPasswordForm,
} from "../../lib/reset-password-validation";

const resetSuccessMessage = "Your password has been reset successfully.";
const invalidResetLinkMessage = "This reset link is invalid or has expired.";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordLoadingState() {
  return (
    <AuthLayout mode="login">
      <AuthCard
        description="Preparing your password reset form."
        eyebrow="Account recovery"
        title="Reset your password"
      >
        <p className="auth-success-message" role="status">
          Loading reset form...
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError(null);

    const nextErrors = validateResetPasswordForm({
      token,
      password,
      confirmPassword,
    });
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        token,
        password,
      });
      setIsSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setSubmitError(getResetPasswordErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout mode="login">
        <AuthCard
          description="The password reset link is missing a valid token."
          eyebrow="Account recovery"
          title="Invalid reset link."
        >
          <div className="auth-action-stack">
            <p className="auth-field-error" role="alert">
              Invalid reset link.
            </p>
            <Link className="ui-button auth-primary-link" href="/login">
              Back to Log In
            </Link>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout mode="login">
        <AuthCard
          description="Use your new password the next time you sign in."
          eyebrow="Account recovery"
          title="Reset your password"
        >
          <div className="auth-action-stack">
            <p className="auth-success-message" role="status">
              {resetSuccessMessage}
            </p>
            <Link className="ui-button auth-primary-link" href="/login">
              Back to Log In
            </Link>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout mode="login">
      <AuthCard
        description="Enter a new password for your account."
        eyebrow="Account recovery"
        title="Reset your password"
      >
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <PasswordInput
            autoComplete="new-password"
            error={errors.password}
            id="reset-password-new-password"
            isVisible={isPasswordVisible}
            label="New password"
            name="password"
            onChange={setPassword}
            onVisibilityChange={setIsPasswordVisible}
            placeholder="At least 8 characters"
            value={password}
          />
          <PasswordInput
            autoComplete="new-password"
            error={errors.confirmPassword}
            id="reset-password-confirm-password"
            isVisible={isConfirmPasswordVisible}
            label="Confirm new password"
            name="confirmPassword"
            onChange={setConfirmPassword}
            onVisibilityChange={setIsConfirmPasswordVisible}
            placeholder="Repeat your new password"
            value={confirmPassword}
          />

          {errors.token ? (
            <p className="auth-field-error" role="alert">
              {errors.token}
            </p>
          ) : null}

          {submitError ? (
            <div className="auth-error-panel" role="alert">
              <p>{submitError}</p>
              <div className="auth-secondary-actions">
                <Link href="/login">Back to Log In</Link>
                <Link href="/auth/forgot-password">Request a new reset link</Link>
              </div>
            </div>
          ) : null}

          <Button
            className="auth-primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <p className="auth-mode-switch">
          Remember your password? <Link href="/login">Back to Log In</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

function getResetPasswordErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("invalid or expired reset token")
  ) {
    return invalidResetLinkMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Could not reset your password. Please try again.";
}
