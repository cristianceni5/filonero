import { pool, type DbClient } from "../db";
import { ApiError } from "../lib/errors";

export async function assertSessionIsActive(
  input: { sessionId: string; userId: string },
  db: DbClient = pool
): Promise<void> {
  const result = await db.query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM sessions
      WHERE id = $1
        AND user_id = $2
        AND revoked_at IS NULL
        AND expires_at > NOW()
    ) AS exists
    `,
    [input.sessionId, input.userId]
  );

  if (!result.rows[0]?.exists) {
    throw new ApiError(401, "Session expired or revoked", "UNAUTHORIZED");
  }
}
