import type { Handler } from "@netlify/functions";
import { env } from "../../src/config/env";
import { emptyResponse, errorResponse } from "../../src/lib/http";
import { routeRequest } from "../../src/routes";

export const handler: Handler = async (event) => {
  const startedAt = Date.now();
  const method = (event.httpMethod || "GET").toUpperCase();
  const path = event.path || "/";

  try {
    if (env.LOG_REQUESTS) {
      console.log(`[api] -> ${method} ${path}`);
    }

    if (method === "OPTIONS") {
      return emptyResponse(event, 204);
    }

    const response = await routeRequest(event);

    if (env.LOG_REQUESTS) {
      console.log(`[api] <- ${response.statusCode} ${method} ${path} (${Date.now() - startedAt}ms)`);
    }

    return response;
  } catch (error) {
    if (env.LOG_REQUESTS) {
      console.log(`[api] !! ${method} ${path} (${Date.now() - startedAt}ms)`);
    }
    return errorResponse(event, error);
  }
};
