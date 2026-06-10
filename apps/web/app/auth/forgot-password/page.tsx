"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthCard, AuthLayout } from "../../components/auth/AuthorizationUI";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { forgotPassword } from "../../lib/auth-api";
import {
  type ForgotPasswordFormErrors,
  validateForgotPasswordForm,
} from "../../lib/forgot-password-validation";

const genericSuccessMessage =
  "If an account with this email exists, password reset instructions have been sent.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    setSuccessMessage(null);

    const nextErrors = validateForgotPasswordForm({ email });
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(response.message || genericSuccessMessage);
    } catch (error) {
      setSubmitError(getForgotPasswordErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <AuthCard
        description="Enter your email and we'll send you password reset instructions."
        eyebrow="Account recovery"
        title="Forgot password?"
      >
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <div className="auth-field">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              aria-describedby={errors.email ? "forgot-password-email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              id="forgot-password-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              type="email"
              value={email}
            />
            {errors.email ? (
              <p
                className="auth-field-error"
                id="forgot-password-email-error"
                role="alert"
              >
                {errors.email}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="auth-field-error" role="alert">
              {submitError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="auth-success-message" role="status">
              {successMessage}
            </p>
          ) : null}

          <Button
            className="auth-primary-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset instructions"}
          </Button>
        </form>

        <p className="auth-mode-switch">
          Remember your password? <Link href="/login">Back to login</Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

function getForgotPasswordErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Could not send password reset instructions. Please try again.";
}
