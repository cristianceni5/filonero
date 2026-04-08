import { env } from "../config/env";
import { pool, withTransaction, type DbClient } from "../db";
import { ApiError } from "../lib/errors";
import { getMailService } from "./mail/mail.service";
import { createUser, findUserByEmail, findUserById, type UserRecord } from "./users.service";
import { hashToken } from "../utils/hash";
import { getAccessTokenExpiresAt, signAccessToken } from "../utils/jwt";
import { normalizeEmail, normalizeNickname } from "../utils/normalize";
import { hashPassword, verifyPassword } from "../utils/password";
import { generateSecureToken } from "../utils/tokens";

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  isEmailVerified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionPayload = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

type SessionRow = {
  id: string;
  expires_at: Date;
};

type MagicLinkWithUserRow = {
  magic_link_id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
  email: string;
  nickname: string;
  is_email_verified: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type SessionWithUserRow = {
  session_id: string;
  user_id: string;
  expires_at: Date;
  revoked_at: Date | null;
  email: string;
  nickname: string;
  is_email_verified: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
};

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    isEmailVerified: user.isEmailVerified,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function mapSessionRowToAuthUser(row: SessionWithUserRow): AuthUser {
  return {
    id: row.user_id,
    email: row.email,
    nickname: row.nickname,
    isEmailVerified: row.is_email_verified,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapMagicRowToAuthUser(row: MagicLinkWithUserRow): AuthUser {
  return {
    id: row.user_id,
    email: row.email,
    nickname: row.nickname,
    isEmailVerified: row.is_email_verified,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function assertUserIsActive(user: Pick<AuthUser, "status">): void {
  if (user.status !== "active") {
    throw new ApiError(403, "User is not active", "USER_NOT_ACTIVE");
  }
}

function buildMagicLinkUrl(rawToken: string): string {
  const normalizedBase = env.APP_BASE_URL.replace(/\/+$/, "");
  return `${normalizedBase}/magic-link?token=${encodeURIComponent(rawToken)}`;
}

async function createSessionForUser(
  userId: string,
  metadata: { userAgent?: string | null; ipAddress?: string | null },
  db: DbClient = pool
): Promise<SessionPayload> {
  const refreshToken = generateSecureToken(48);
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const sessionResult = await db.query<SessionRow>(
    `
    INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, expires_at
    `,
    [userId, refreshTokenHash, metadata.userAgent ?? null, metadata.ipAddress ?? null, refreshTokenExpiresAt]
  );

  const session = sessionResult.rows[0];
  const accessToken = signAccessToken(userId, session.id);

  return {
    accessToken,
    accessTokenExpiresAt: getAccessTokenExpiresAt(accessToken),
    refreshToken,
    refreshTokenExpiresAt: session.expires_at.toISOString()
  };
}

export async function registerWithEmailPassword(
  input: { email: string; password: string; nickname: string },
  metadata: { userAgent?: string | null; ipAddress?: string | null }
): Promise<{ user: AuthUser; session: SessionPayload }> {
  return withTransaction(async (client) => {
    const passwordHash = await hashPassword(input.password);
    const user = await createUser(
      {
        email: normalizeEmail(input.email),
        passwordHash,
        nickname: normalizeNickname(input.nickname)
      },
      client
    );

    const session = await createSessionForUser(user.id, metadata, client);
    return { user: toAuthUser(user), session };
  });
}

export async function loginWithEmailPassword(
  input: { email: string; password: string },
  metadata: { userAgent?: string | null; ipAddress?: string | null }
): Promise<{ user: AuthUser; session: SessionPayload }> {
  const user = await findUserByEmail(normalizeEmail(input.email));
  if (!user) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const authUser = toAuthUser(user);
  assertUserIsActive(authUser);

  const session = await createSessionForUser(user.id, metadata);
  return { user: authUser, session };
}

export async function requestMagicLink(input: { email: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  // Uniform response to prevent email enumeration.
  if (!user || user.status !== "active") {
    return;
  }

  const rawToken = generateSecureToken(48);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `
    INSERT INTO magic_links (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    `,
    [user.id, tokenHash, expiresAt]
  );

  await getMailService().sendMagicLink({
    to: user.email,
    nickname: user.nickname,
    magicLinkUrl: buildMagicLinkUrl(rawToken),
    expiresInMinutes: env.MAGIC_LINK_TTL_MINUTES
  });
}

export async function verifyMagicLinkAndCreateSession(
  input: { token: string },
  metadata: { userAgent?: string | null; ipAddress?: string | null }
): Promise<{ user: AuthUser; session: SessionPayload }> {
  return withTransaction(async (client) => {
    const tokenHash = hashToken(input.token);

    const result = await client.query<MagicLinkWithUserRow>(
      `
      SELECT
        ml.id AS magic_link_id,
        ml.user_id,
        ml.expires_at,
        ml.used_at,
        u.email,
        u.nickname,
        u.is_email_verified,
        u.status,
        u.created_at,
        u.updated_at
      FROM magic_links ml
      INNER JOIN users u ON u.id = ml.user_id
      WHERE ml.token_hash = $1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      throw new ApiError(401, "Magic link is invalid or expired", "INVALID_MAGIC_LINK");
    }

    const row = result.rows[0];
    if (row.used_at || row.expires_at.getTime() <= Date.now()) {
      throw new ApiError(401, "Magic link is invalid or expired", "INVALID_MAGIC_LINK");
    }

    const updated = await client.query(
      `
      UPDATE magic_links
      SET used_at = NOW()
      WHERE id = $1
        AND used_at IS NULL
      `,
      [row.magic_link_id]
    );

    if (updated.rowCount !== 1) {
      throw new ApiError(401, "Magic link already used", "INVALID_MAGIC_LINK");
    }

    await client.query(
      `
      UPDATE users
      SET is_email_verified = TRUE, updated_at = NOW()
      WHERE id = $1
      `,
      [row.user_id]
    );

    const user = mapMagicRowToAuthUser(row);
    assertUserIsActive(user);

    const session = await createSessionForUser(row.user_id, metadata, client);
    return {
      user: {
        ...user,
        isEmailVerified: true
      },
      session
    };
  });
}

export async function refreshSession(input: {
  refreshToken: string;
}): Promise<{ user: AuthUser; session: SessionPayload }> {
  return withTransaction(async (client) => {
    const refreshTokenHash = hashToken(input.refreshToken);

    const result = await client.query<SessionWithUserRow>(
      `
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        s.revoked_at,
        u.email,
        u.nickname,
        u.is_email_verified,
        u.status,
        u.created_at,
        u.updated_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.refresh_token_hash = $1
      FOR UPDATE
      `,
      [refreshTokenHash]
    );

    if (result.rowCount === 0) {
      throw new ApiError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    const row = result.rows[0];
    if (row.revoked_at || row.expires_at.getTime() <= Date.now()) {
      throw new ApiError(401, "Refresh token expired or revoked", "INVALID_REFRESH_TOKEN");
    }

    const user = mapSessionRowToAuthUser(row);
    assertUserIsActive(user);

    const newRefreshToken = generateSecureToken(48);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newRefreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await client.query(
      `
      UPDATE sessions
      SET refresh_token_hash = $1, expires_at = $2
      WHERE id = $3
      `,
      [newRefreshTokenHash, newRefreshExpiresAt, row.session_id]
    );

    const accessToken = signAccessToken(row.user_id, row.session_id);
    return {
      user,
      session: {
        accessToken,
        accessTokenExpiresAt: getAccessTokenExpiresAt(accessToken),
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: newRefreshExpiresAt.toISOString()
      }
    };
  });
}

export async function logout(input: { sessionId?: string; refreshToken?: string }): Promise<void> {
  if (!input.sessionId && !input.refreshToken) {
    return;
  }

  await withTransaction(async (client) => {
    if (input.refreshToken) {
      const refreshTokenHash = hashToken(input.refreshToken);
      await client.query(
        `
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE refresh_token_hash = $1
          AND revoked_at IS NULL
        `,
        [refreshTokenHash]
      );
    }

    if (input.sessionId) {
      await client.query(
        `
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE id = $1
          AND revoked_at IS NULL
        `,
        [input.sessionId]
      );
    }
  });
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(401, "User not found", "UNAUTHORIZED");
  }

  const authUser = toAuthUser(user);
  assertUserIsActive(authUser);
  return authUser;
}
