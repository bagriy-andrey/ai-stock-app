export interface ResetPasswordFormValues {
  token: string;
  password: string;
  confirmPassword: string;
}

export type ResetPasswordFormErrors = Partial<
  Record<keyof ResetPasswordFormValues, string>
>;

export function validateResetPasswordForm(
  values: ResetPasswordFormValues,
): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};
  const token = values.token.trim();
  const password = values.password;
  const confirmPassword = values.confirmPassword;

  if (!token) {
    errors.token = "Invalid reset link.";
  }

  if (!password) {
    errors.password = "Enter a new password.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
