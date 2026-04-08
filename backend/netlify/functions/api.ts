import type { Handler } from "@netlify/functions";
import { emptyResponse, errorResponse } from "../../src/lib/http";
import { routeRequest } from "../../src/routes";

export const handler: Handler = async (event) => {
  try {
    if ((event.httpMethod || "").toUpperCase() === "OPTIONS") {
      return emptyResponse(event, 204);
    }

    return await routeRequest(event);
  } catch (error) {
    return errorResponse(event, error);
  }
};
