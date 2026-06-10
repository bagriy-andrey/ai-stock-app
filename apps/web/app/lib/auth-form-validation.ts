export type AuthMode = "login" | "signup";

export interface LoginFormValues {
  identifier: string;
  password: string;
}

export interface SignupFormValues {
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
export type SignupFormErrors = Partial<Record<keyof SignupFormValues, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nicknamePattern = /^[A-Za-z0-9._-]+$/;

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.identifier.trim()) {
    errors.identifier = "Enter your email, phone or nickname.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export function validateSignupForm(values: SignupFormValues): SignupFormErrors {
  const errors: SignupFormErrors = {};
  const email = values.email.trim();
  const nickname = values.nickname.trim();

  if (!email) {
    errors.email = "Enter your email.";
  } else if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!nickname) {
    errors.nickname = "Enter your nickname.";
  } else if (nickname.length < 3 || nickname.length > 30) {
    errors.nickname = "Nickname must be 3-30 characters.";
  } else if (!nicknamePattern.test(nickname)) {
    errors.nickname =
      "Nickname can use letters, numbers, underscore, dot and hyphen.";
  }

  if (!values.password) {
    errors.password = "Enter your password.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords must match.";
  }

  return errors;
}

export function hasFormErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
