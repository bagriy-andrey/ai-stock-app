import type {
  AuthProvider,
  AuthResponse,
  GoogleLoginRequest,
  RegisterWithEmailRequest,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

export function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const body: GoogleLoginRequest = { credential };

  return apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registerWithEmail(
  payload: RegisterWithEmailRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginWithProvider(
  provider: AuthProvider,
  payload: unknown,
): Promise<AuthResponse> {
  if (provider === "google" && isGoogleLoginPayload(payload)) {
    return loginWithGoogle(payload.credential);
  }

  return Promise.reject(new Error(`${provider} login is not implemented yet`));
}

export function loginWithEmail(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("email", payload);
}

export function loginWithApple(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("apple", payload);
}

export function loginWithFacebook(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("facebook", payload);
}

export function loginWithPhone(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("phone", payload);
}

function loginWithUnimplementedProvider(
  provider: Exclude<AuthProvider, "google">,
  payload: unknown,
): Promise<AuthResponse> {
  void payload;
  return Promise.reject(new Error(`${provider} login is not implemented yet`));
}

function isGoogleLoginPayload(payload: unknown): payload is GoogleLoginRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "credential" in payload &&
    typeof payload.credential === "string"
  );
}
