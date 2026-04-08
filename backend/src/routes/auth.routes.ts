import { env } from "../config/env";
import { ApiError } from "../lib/errors";
import { consumeRateLimit } from "../lib/rate-limit";
import {
  getClientIp,
  getUserAgent,
  jsonResponse,
  parseJsonBody,
  parseOptionalJsonBody
} from "../lib/http";
import {
  getMe,
  loginWithEmailPassword,
  logout,
  refreshSession,
  registerWithEmailPassword,
  requestMagicLink,
  verifyMagicLinkAndCreateSession
} from "../services/auth.service";
import { requireAccessToken } from "../utils/auth-context";
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  requestMagicLinkSchema,
  verifyMagicLinkSchema
} from "../validation/auth.validation";
import type { RouteDefinition } from "./types";

const MAGIC_LINK_RESPONSE = {
  message: "Se l'email e registrata, riceverai un link di accesso tra pochi istanti."
};

function requireRateLimit(action: "register" | "login" | "magic", ip: string | null): void {
  const source = ip ?? "unknown";
  const key = `${action}:${source}`;

  const max =
    action === "register"
      ? env.RATE_LIMIT_MAX_REGISTER
      : action === "login"
        ? env.RATE_LIMIT_MAX_LOGIN
        : env.RATE_LIMIT_MAX_MAGIC_LINK;

  const allowed = consumeRateLimit(key, max, env.RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    throw new ApiError(429, "Too many requests. Retry later.", "RATE_LIMITED");
  }
}

export const authRoutes: RouteDefinition[] = [
  {
    method: "POST",
    pattern: /^\/auth\/register$/,
    handler: async ({ event }) => {
      const input = parseJsonBody(event, registerSchema);
      requireRateLimit("register", getClientIp(event));

      const result = await registerWithEmailPassword(input, {
        userAgent: getUserAgent(event),
        ipAddress: getClientIp(event)
      });

      return jsonResponse(event, 201, result);
    }
  },
  {
    method: "POST",
    pattern: /^\/auth\/login$/,
    handler: async ({ event }) => {
      const input = parseJsonBody(event, loginSchema);
      requireRateLimit("login", getClientIp(event));

      const result = await loginWithEmailPassword(input, {
        userAgent: getUserAgent(event),
        ipAddress: getClientIp(event)
      });

      return jsonResponse(event, 200, result);
    }
  },
  {
    method: "POST",
    pattern: /^\/auth\/magic-link\/request$/,
    handler: async ({ event }) => {
      const input = parseJsonBody(event, requestMagicLinkSchema);
      requireRateLimit("magic", getClientIp(event));

      try {
        await requestMagicLink(input);
      } catch (error) {
        // Keep uniform response even if sending fails.
        console.error("Magic link request failed", error);
      }

      return jsonResponse(event, 200, MAGIC_LINK_RESPONSE);
    }
  },
  {
    method: "POST",
    pattern: /^\/auth\/magic-link\/verify$/,
    handler: async ({ event }) => {
      const input = parseJsonBody(event, verifyMagicLinkSchema);

      const result = await verifyMagicLinkAndCreateSession(input, {
        userAgent: getUserAgent(event),
        ipAddress: getClientIp(event)
      });

      return jsonResponse(event, 200, result);
    }
  },
  {
    method: "POST",
    pattern: /^\/auth\/refresh$/,
    handler: async ({ event }) => {
      const input = parseJsonBody(event, refreshSchema);
      const result = await refreshSession(input);
      return jsonResponse(event, 200, result);
    }
  },
  {
    method: "POST",
    pattern: /^\/auth\/logout$/,
    handler: async ({ event }) => {
      const access = (() => {
        try {
          return requireAccessToken(event);
        } catch {
          return null;
        }
      })();

      const body = parseOptionalJsonBody(event, logoutSchema, {});
      await logout({
        sessionId: access?.sid,
        refreshToken: body.refreshToken
      });

      return jsonResponse(event, 200, { success: true });
    }
  },
  {
    method: "GET",
    pattern: /^\/auth\/me$/,
    handler: async ({ event }) => {
      const access = requireAccessToken(event);
      const user = await getMe(access.sub);
      return jsonResponse(event, 200, { user });
    }
  }
];
