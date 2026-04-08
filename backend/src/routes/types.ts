import type { HandlerEvent, HandlerResponse } from "@netlify/functions";

export type RouteContext = {
  event: HandlerEvent;
  path: string;
  params: Record<string, string>;
};

export type RouteHandler = (context: RouteContext) => Promise<HandlerResponse>;

export type RouteDefinition = {
  method: "GET" | "POST" | "PATCH";
  pattern: RegExp;
  paramNames?: string[];
  handler: RouteHandler;
};
