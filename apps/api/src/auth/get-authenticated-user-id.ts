import { UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedRequest } from "./authenticated-request";

export function getAuthenticatedUserId(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new UnauthorizedException(
      "Authenticated request is missing user payload",
    );
  }

  return request.user.sub;
}
