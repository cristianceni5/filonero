import { z } from "zod";
import { nicknameSchema } from "./common.validation";

export const updateMeSchema = z
  .object({
    nickname: nicknameSchema
  })
  .strict();

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(1).max(50)
});
