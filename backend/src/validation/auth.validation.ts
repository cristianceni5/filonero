import { z } from "zod";
import { emailSchema, nicknameSchema, passwordSchema } from "./common.validation";

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const requestMagicLinkSchema = z.object({
  email: emailSchema
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(32).max(1024)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(1024)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(32).max(1024).optional()
});
