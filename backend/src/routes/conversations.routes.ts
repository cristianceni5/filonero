import { ApiError } from "../lib/errors";
import { jsonResponse, parseJsonBody, parseQuery } from "../lib/http";
import {
  createOrGetDirectConversation,
  getConversationForUser,
  listConversationsForUser
} from "../services/conversations.service";
import { listMessagesByConversation, sendMessageToConversation } from "../services/messages.service";
import { requireAccessToken } from "../utils/auth-context";
import {
  conversationParamsSchema,
  createConversationSchema
} from "../validation/conversations.validation";
import { listMessagesQuerySchema, messageBodySchema } from "../validation/messages.validation";
import type { RouteDefinition } from "./types";

function parseConversationId(rawId: string): string {
  const parsed = conversationParamsSchema.safeParse({ id: rawId });
  if (!parsed.success) {
    throw new ApiError(400, "Invalid conversation id", "BAD_REQUEST");
  }

  return parsed.data.id;
}

export const conversationsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    pattern: /^\/conversations$/,
    handler: async ({ event }) => {
      const access = requireAccessToken(event);
      const conversations = await listConversationsForUser(access.sub);
      return jsonResponse(event, 200, { conversations });
    }
  },
  {
    method: "POST",
    pattern: /^\/conversations$/,
    handler: async ({ event }) => {
      const access = requireAccessToken(event);
      const input = parseJsonBody(event, createConversationSchema);
      const conversation = await createOrGetDirectConversation(access.sub, input.otherUserId);
      return jsonResponse(event, 201, { conversation });
    }
  },
  {
    method: "GET",
    pattern: /^\/conversations\/([0-9a-fA-F-]{36})$/,
    paramNames: ["id"],
    handler: async ({ event, params }) => {
      const access = requireAccessToken(event);
      const conversationId = parseConversationId(params.id);
      const conversation = await getConversationForUser(access.sub, conversationId);
      return jsonResponse(event, 200, { conversation });
    }
  },
  {
    method: "GET",
    pattern: /^\/conversations\/([0-9a-fA-F-]{36})\/messages$/,
    paramNames: ["id"],
    handler: async ({ event, params }) => {
      const access = requireAccessToken(event);
      const conversationId = parseConversationId(params.id);

      // Membership and existence check.
      await getConversationForUser(access.sub, conversationId);

      const query = parseQuery(event, listMessagesQuerySchema);
      const messages = await listMessagesByConversation({
        conversationId,
        requesterUserId: access.sub,
        before: query.before,
        limit: query.limit ?? 50
      });

      return jsonResponse(event, 200, { messages });
    }
  },
  {
    method: "POST",
    pattern: /^\/conversations\/([0-9a-fA-F-]{36})\/messages$/,
    paramNames: ["id"],
    handler: async ({ event, params }) => {
      const access = requireAccessToken(event);
      const conversationId = parseConversationId(params.id);

      // Membership and existence check.
      await getConversationForUser(access.sub, conversationId);

      const input = parseJsonBody(event, messageBodySchema);
      const message = await sendMessageToConversation({
        conversationId,
        senderUserId: access.sub,
        body: input.body
      });

      return jsonResponse(event, 201, { message });
    }
  }
];
