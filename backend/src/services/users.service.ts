import { pool, type DbClient } from "../db";
import { ApiError } from "../lib/errors";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  is_email_verified: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type UserPublicRow = Omit<UserRow, "password_hash" | "updated_at">;

export type UserRecord = {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  isEmailVerified: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UserPublicProfile = {
  id: string;
  nickname: string;
  status: string;
  createdAt: string;
};

export type UserSearchResult = {
  id: string;
  nickname: string;
  status: string;
};

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    passwordHash: row.password_hash,
    isEmailVerified: row.is_email_verified,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapPublicProfile(row: UserPublicRow): UserPublicProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    status: row.status,
    createdAt: row.created_at.toISOString()
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505";
}

function getConstraintName(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "constraint" in error) {
    return String((error as { constraint?: unknown }).constraint ?? "");
  }
  return undefined;
}

export async function createUser(
  input: { email: string; passwordHash: string; nickname: string },
  db: DbClient = pool
): Promise<UserRecord> {
  try {
    const result = await db.query<UserRow>(
      `
      INSERT INTO users (email, password_hash, nickname)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash, nickname, is_email_verified, status, created_at, updated_at
      `,
      [input.email, input.passwordHash, input.nickname]
    );

    return mapUserRow(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const constraint = getConstraintName(error);
      if (constraint === "users_email_key") {
        throw new ApiError(409, "Email already in use", "EMAIL_TAKEN");
      }

      if (constraint === "users_nickname_key") {
        throw new ApiError(409, "Nickname already in use", "NICKNAME_TAKEN");
      }

      throw new ApiError(409, "User already exists", "USER_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function findUserByEmail(email: string, db: DbClient = pool): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
    SELECT id, email, password_hash, nickname, is_email_verified, status, created_at, updated_at
    FROM users
    WHERE email = $1
    LIMIT 1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUserRow(result.rows[0]);
}

export async function findUserById(userId: string, db: DbClient = pool): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `
    SELECT id, email, password_hash, nickname, is_email_verified, status, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapUserRow(result.rows[0]);
}

export async function findPublicUserById(userId: string, db: DbClient = pool): Promise<UserPublicProfile | null> {
  const result = await db.query<UserPublicRow>(
    `
    SELECT id, email, nickname, is_email_verified, status, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapPublicProfile(result.rows[0]);
}

export async function updateMyProfile(
  userId: string,
  input: { nickname: string },
  db: DbClient = pool
): Promise<UserRecord> {
  try {
    const result = await db.query<UserRow>(
      `
      UPDATE users
      SET nickname = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, password_hash, nickname, is_email_verified, status, created_at, updated_at
      `,
      [userId, input.nickname]
    );

    if (result.rowCount === 0) {
      throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    }

    return mapUserRow(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "Nickname already in use", "NICKNAME_TAKEN");
    }
    throw error;
  }
}

export async function searchUsers(
  input: { query: string; currentUserId: string; limit?: number },
  db: DbClient = pool
): Promise<UserSearchResult[]> {
  const result = await db.query<{ id: string; nickname: string; status: string }>(
    `
    SELECT id, nickname, status
    FROM users
    WHERE nickname ILIKE ($1 || '%')
      AND id <> $2
      AND status = 'active'
    ORDER BY nickname ASC
    LIMIT $3
    `,
    [input.query, input.currentUserId, input.limit ?? 20]
  );

  return result.rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    status: row.status
  }));
}
