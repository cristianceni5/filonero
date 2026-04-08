import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { ApiError } from "../lib/errors";
import { authRoutes } from "./auth.routes";
import { conversationsRoutes } from "./conversations.routes";
import type { RouteDefinition } from "./types";
import { usersRoutes } from "./users.routes";

const routes: RouteDefinition[] = [...authRoutes, ...usersRoutes, ...conversationsRoutes];

function normalizePath(rawPath: string): string {
  const noQuery = rawPath.split("?")[0];
  const netlifyPrefix = "/.netlify/functions/api";

  let path = noQuery;

  if (path.startsWith(netlifyPrefix)) {
    path = path.slice(netlifyPrefix.length) || "/";
  }

  if (path.startsWith("/api")) {
    path = path.slice(4) || "/";
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }

  return path || "/";
}

function extractParams(route: RouteDefinition, match: RegExpMatchArray): Record<string, string> {
  if (!route.paramNames?.length) {
    return {};
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < route.paramNames.length; i += 1) {
    params[route.paramNames[i]] = match[i + 1];
  }

  return params;
}

export async function routeRequest(event: HandlerEvent): Promise<HandlerResponse> {
  const method = (event.httpMethod || "GET").toUpperCase();
  const path = normalizePath(event.path || "/");

  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const match = path.match(route.pattern);
    if (!match) {
      continue;
    }

    const params = extractParams(route, match);
    return route.handler({ event, path, params });
  }

  const allowedMethods = routes
    .filter((route) => route.pattern.test(path))
    .map((route) => route.method)
    .filter((value, index, array) => array.indexOf(value) === index);

  if (allowedMethods.length > 0) {
    throw new ApiError(405, `Method not allowed. Allowed: ${allowedMethods.join(", ")}`, "METHOD_NOT_ALLOWED");
  }

  throw new ApiError(404, "Endpoint not found", "NOT_FOUND");
}
