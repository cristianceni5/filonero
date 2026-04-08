import type { HandlerEvent } from "@netlify/functions";
import { ApiError } from "../lib/errors";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

export function getBearerToken(event: HandlerEvent): string | null {
  const rawAuthorization = event.headers.authorization ?? event.headers.Authorization;
  if (!rawAuthorization) {
    return null;
  }

  const [scheme, token] = rawAuthorization.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export function requireAccessToken(event: HandlerEvent): AccessTokenPayload {
  const token = getBearerToken(event);
  if (!token) {
    throw new ApiError(401, "Missing Bearer access token", "UNAUTHORIZED");
  }

  return verifyAccessToken(token);
}
