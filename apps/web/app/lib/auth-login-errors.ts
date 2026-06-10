export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("Invalid credentials")) {
    return "Invalid email/nickname or password";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Could not log in. Please try again.";
}
