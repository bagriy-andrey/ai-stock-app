import type {
  AuthProvider,
  AppleLoginRequest,
  AuthResponse,
  ConnectedAccountsResponse,
  FacebookLoginRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleLinkRequest,
  GoogleLoginRequest,
  LinkedAuthProviderResponse,
  LoginWithEmailRequest,
  RegisterWithEmailRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "@ai-stock-advisor/shared";
import { apiRequest } from "./api";

export function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const body: GoogleLoginRequest = { credential };

  return apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginWithApple(payload: AppleLoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/apple", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginWithFacebook(
  payload: FacebookLoginRequest,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/facebook", {
    method: "POST",
    body: JSON.stringify(payload),
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

export function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const body: ForgotPasswordRequest = { email };

  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resetPassword(
  payload: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchConnectedAccounts(
  accessToken: string,
): Promise<ConnectedAccountsResponse> {
  return apiRequest<ConnectedAccountsResponse>("/auth/connected-accounts", {
    headers: getAuthorizationHeader(accessToken),
  });
}

export function linkGoogle(
  accessToken: string,
  idToken: string,
): Promise<LinkedAuthProviderResponse> {
  const body: GoogleLinkRequest = { idToken };

  return apiRequest<LinkedAuthProviderResponse>("/auth/link/google", {
    method: "POST",
    headers: getAuthorizationHeader(accessToken),
    body: JSON.stringify(body),
  });
}

export function linkApple(
  accessToken: string,
  payload: AppleLoginRequest,
): Promise<LinkedAuthProviderResponse> {
  return apiRequest<LinkedAuthProviderResponse>("/auth/link/apple", {
    method: "POST",
    headers: getAuthorizationHeader(accessToken),
    body: JSON.stringify(payload),
  });
}

export function linkFacebook(
  accessToken: string,
  payload: FacebookLoginRequest,
): Promise<LinkedAuthProviderResponse> {
  return apiRequest<LinkedAuthProviderResponse>("/auth/link/facebook", {
    method: "POST",
    headers: getAuthorizationHeader(accessToken),
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

  if (provider === "apple" && isAppleLoginPayload(payload)) {
    return loginWithApple(payload);
  }

  if (provider === "facebook" && isFacebookLoginPayload(payload)) {
    return loginWithFacebook(payload);
  }

  if (provider === "email" && isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  if (provider === "phone" && isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  return Promise.reject(new Error(`${provider} login payload is invalid`));
}

export function loginWithPhone(payload: unknown): Promise<AuthResponse> {
  if (isEmailLoginPayload(payload)) {
    return loginWithEmail(payload);
  }

  return Promise.reject(new Error("phone login requires identifier and password"));
}

function isGoogleLoginPayload(payload: unknown): payload is GoogleLoginRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "credential" in payload &&
    typeof payload.credential === "string"
  );
}

function isAppleLoginPayload(payload: unknown): payload is AppleLoginRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "identityToken" in payload &&
    typeof payload.identityToken === "string"
  );
}

function isFacebookLoginPayload(
  payload: unknown,
): payload is FacebookLoginRequest {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "accessToken" in payload &&
    typeof payload.accessToken === "string"
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

function getAuthorizationHeader(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}
