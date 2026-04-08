import { z } from "zod";

export const messageBodySchema = z.object({
  body: z.string().trim().min(1).max(4000)
});

export const listMessagesQuerySchema = z.object({
  before: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Invalid before datetime"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});
