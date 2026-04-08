import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import type { ZodSchema } from "zod";
import { env } from "../config/env";
import { ApiError, isApiError } from "./errors";

function getHeaderValue(event: HandlerEvent, name: string): string | undefined {
  const direct = event.headers[name];
  if (direct) {
    return direct;
  }

  const lowerName = name.toLowerCase();
  const matchedKey = Object.keys(event.headers).find((key) => key.toLowerCase() === lowerName);
  return matchedKey ? event.headers[matchedKey] : undefined;
}

function resolveCorsOrigin(event: HandlerEvent): string {
  const allowed = env.CORS_ALLOWED_ORIGINS_LIST;
  if (allowed.includes("*")) {
    return "*";
  }

  const requestOrigin = getHeaderValue(event, "origin");
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowed[0] ?? "*";
}

export function buildCorsHeaders(event: HandlerEvent): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveCorsOrigin(event),
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

export function jsonResponse(
  event: HandlerEvent,
  statusCode: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {}
): HandlerResponse {
  return {
    statusCode,
    headers: {
      ...buildCorsHeaders(event),
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    },
    body: JSON.stringify(payload)
  };
}

export function emptyResponse(event: HandlerEvent, statusCode = 204): HandlerResponse {
  return {
    statusCode,
    headers: buildCorsHeaders(event),
    body: ""
  };
}

export function parseJsonBody<T>(event: HandlerEvent, schema: ZodSchema<T>): T {
  if (!event.body) {
    throw new ApiError(400, "JSON body is required", "BAD_REQUEST");
  }

  let rawBody = event.body;
  if (event.isBase64Encoded) {
    rawBody = Buffer.from(rawBody, "base64").toString("utf8");
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    throw new ApiError(400, "Invalid JSON body", "BAD_REQUEST");
  }

  const validation = schema.safeParse(parsedBody);
  if (!validation.success) {
    throw new ApiError(422, "Validation failed", "VALIDATION_ERROR", validation.error.flatten());
  }

  return validation.data;
}

export function parseOptionalJsonBody<T>(event: HandlerEvent, schema: ZodSchema<T>, fallback: T): T {
  if (!event.body) {
    return fallback;
  }

  return parseJsonBody(event, schema);
}

export function parseQuery<T>(event: HandlerEvent, schema: ZodSchema<T>): T {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(event.queryStringParameters ?? {})) {
    if (typeof value === "string") {
      query[key] = value;
    }
  }

  const validation = schema.safeParse(query);
  if (!validation.success) {
    throw new ApiError(422, "Invalid query parameters", "VALIDATION_ERROR", validation.error.flatten());
  }

  return validation.data;
}

export function getClientIp(event: HandlerEvent): string | null {
  const direct = getHeaderValue(event, "x-nf-client-connection-ip");
  if (direct) {
    return direct;
  }

  const forwardedFor = getHeaderValue(event, "x-forwarded-for");
  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() ?? null;
}

export function getUserAgent(event: HandlerEvent): string | null {
  return getHeaderValue(event, "user-agent") ?? null;
}

export function errorResponse(event: HandlerEvent, error: unknown): HandlerResponse {
  if (isApiError(error)) {
    return jsonResponse(event, error.statusCode, {
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null
      }
    });
  }

  console.error("Unhandled error", error);

  return jsonResponse(event, 500, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    }
  });
}
