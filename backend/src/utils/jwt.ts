import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../lib/errors";

const JWT_ISSUER = "filonero-backend";
const JWT_AUDIENCE = "filonero-app";

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  sid: string;
  typ: "access";
};

export function signAccessToken(userId: string, sessionId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  };

  return jwt.sign({ sub: userId, sid: sessionId, typ: "access" }, env.JWT_ACCESS_SECRET, {
    ...options
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    if (typeof decoded !== "object" || !decoded.sub || !decoded.sid || decoded.typ !== "access") {
      throw new ApiError(401, "Invalid access token", "UNAUTHORIZED");
    }

    return decoded as AccessTokenPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired access token", "UNAUTHORIZED");
  }
}

export function getAccessTokenExpiresAt(accessToken: string): string {
  const decoded = jwt.decode(accessToken) as JwtPayload | null;
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000).toISOString();
  }

  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}
