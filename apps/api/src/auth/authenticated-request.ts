import type { JwtPayload } from "./jwt-payload";

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: JwtPayload;
}
