export interface ForgotPasswordFormValues {
  email: string;
}

export type ForgotPasswordFormErrors = Partial<
  Record<keyof ForgotPasswordFormValues, string>
>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Enter your email.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}
