import type {
  AuthProvider,
  AuthResponse,
  GoogleLoginRequest,
  LoginWithEmailRequest,
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

export function loginWithEmail(
  payload: LoginWithEmailRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
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

  if (provider === "email" && isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  if (provider === "phone" && isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  return Promise.reject(new Error(`${provider} login is not implemented yet`));
}

export function loginWithApple(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("apple", payload);
}

export function loginWithFacebook(payload: unknown): Promise<AuthResponse> {
  return loginWithUnimplementedProvider("facebook", payload);
}

export function loginWithPhone(payload: unknown): Promise<AuthResponse> {
  if (isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  return Promise.reject(new Error("phone login requires identifier and password"));
}

function loginWithUnimplementedProvider(
  provider: Exclude<AuthProvider, "google" | "phone">,
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

function isEmailLoginPayload(payload: unknown): payload is LoginWithEmailRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "identifier" in payload &&
    typeof payload.identifier === "string" &&
    "password" in payload &&
    typeof payload.password === "string"
  );
}
