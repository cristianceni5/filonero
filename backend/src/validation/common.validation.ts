import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const passwordSchema = z.string().min(8).max(128);
export const nicknameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9_]+$/, "Nickname supports letters, numbers and underscore only");
