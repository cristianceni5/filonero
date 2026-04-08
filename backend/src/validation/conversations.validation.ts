import { z } from "zod";
import { uuidSchema } from "./common.validation";

export const conversationParamsSchema = z.object({
  id: uuidSchema
});

export const createConversationSchema = z.object({
  otherUserId: uuidSchema
});
