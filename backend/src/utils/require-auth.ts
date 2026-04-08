import type { HandlerEvent } from "@netlify/functions";
import { assertSessionIsActive } from "../services/sessions.service";
import { requireAccessToken } from "./auth-context";

export async function requireAuthenticatedSession(event: HandlerEvent) {
  const access = requireAccessToken(event);
  await assertSessionIsActive({
    sessionId: access.sid,
    userId: access.sub
  });
  return access;
}
