import type { UpdateProfileRequest, UserDto } from "@ai-stock-advisor/shared";
import { apiBaseUrl, apiRequest } from "./api";

function getAuthorizationHeader(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
  };
}

export function fetchProfile(accessToken: string): Promise<UserDto> {
  return apiRequest<UserDto>("/profile", {
    headers: getAuthorizationHeader(accessToken),
  });
}

export function updateProfile(
  accessToken: string,
  input: UpdateProfileRequest,
): Promise<UserDto> {
  return apiRequest<UserDto>("/profile", {
    method: "PATCH",
    headers: getAuthorizationHeader(accessToken),
    body: JSON.stringify(input),
  });
}

export function uploadProfileAvatar(
  accessToken: string,
  avatar: File,
): Promise<UserDto> {
  const body = new FormData();
  body.set("avatar", avatar);

  return apiRequest<UserDto>("/profile/avatar", {
    method: "POST",
    headers: getAuthorizationHeader(accessToken),
    body,
  });
}

export function deleteProfileAvatar(accessToken: string): Promise<UserDto> {
  return apiRequest<UserDto>("/profile/avatar", {
    method: "DELETE",
    headers: getAuthorizationHeader(accessToken),
  });
}

export function resolveAvatarUrl(avatarUrl: string | undefined): string | undefined {
  return avatarUrl?.startsWith("/") ? `${apiBaseUrl}${avatarUrl}` : avatarUrl;
}
