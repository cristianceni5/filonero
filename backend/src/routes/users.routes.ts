import { ApiError } from "../lib/errors";
import { jsonResponse, parseJsonBody, parseQuery } from "../lib/http";
import { findPublicUserById, searchUsers, updateMyProfile } from "../services/users.service";
import { requireAccessToken } from "../utils/auth-context";
import { uuidSchema } from "../validation/common.validation";
import { searchUsersQuerySchema, updateMeSchema } from "../validation/users.validation";
import type { RouteDefinition } from "./types";

export const usersRoutes: RouteDefinition[] = [
  {
    method: "GET",
    pattern: /^\/users\/search$/,
    handler: async ({ event }) => {
      const access = requireAccessToken(event);
      const query = parseQuery(event, searchUsersQuerySchema);

      const users = await searchUsers({
        query: query.q,
        currentUserId: access.sub,
        limit: 20
      });

      return jsonResponse(event, 200, { users });
    }
  },
  {
    method: "GET",
    pattern: /^\/users\/([0-9a-fA-F-]{36})$/,
    paramNames: ["id"],
    handler: async ({ event, params }) => {
      requireAccessToken(event);

      const parsedId = uuidSchema.safeParse(params.id);
      if (!parsedId.success) {
        throw new ApiError(400, "Invalid user id", "BAD_REQUEST");
      }

      const user = await findPublicUserById(parsedId.data);
      if (!user) {
        throw new ApiError(404, "User not found", "USER_NOT_FOUND");
      }

      return jsonResponse(event, 200, { user });
    }
  },
  {
    method: "PATCH",
    pattern: /^\/users\/me$/,
    handler: async ({ event }) => {
      const access = requireAccessToken(event);
      const input = parseJsonBody(event, updateMeSchema);
      const user = await updateMyProfile(access.sub, input);
      return jsonResponse(event, 200, {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          isEmailVerified: user.isEmailVerified,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }
  }
];
