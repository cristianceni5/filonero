import { pool, withTransaction, type DbClient } from "../db";
import { ApiError } from "../lib/errors";
import { findUserById } from "./users.service";

export type ConversationMember = {
  id: string;
  nickname: string;
  status: string;
};

export type ConversationLastMessage = {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  type: "direct";
  createdAt: string;
  members: ConversationMember[];
  lastMessage: ConversationLastMessage | null;
};

type ConversationRow = {
  id: string;
  type: "direct";
  created_at: Date;
  members: Array<{ id: string; nickname: string; status: string }> | null;
  last_message_id: string | null;
  last_message_sender_user_id: string | null;
  last_message_body: string | null;
  last_message_created_at: Date | null;
};

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at.toISOString(),
    members: Array.isArray(row.members) ? row.members : [],
    lastMessage: row.last_message_id
      ? {
          id: row.last_message_id,
          senderUserId: row.last_message_sender_user_id as string,
          body: row.last_message_body as string,
          createdAt: (row.last_message_created_at as Date).toISOString()
        }
      : null
  };
}

async function fetchConversationByIdForUser(
  userId: string,
  conversationId: string,
  db: DbClient = pool
): Promise<Conversation | null> {
  const result = await db.query<ConversationRow>(
    `
    SELECT
      c.id,
      c.type,
      c.created_at,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', u.id,
          'nickname', u.nickname,
          'status', u.status
        )
        ORDER BY u.nickname
      ) AS members,
      lm.id AS last_message_id,
      lm.sender_user_id AS last_message_sender_user_id,
      lm.body AS last_message_body,
      lm.created_at AS last_message_created_at
    FROM conversations c
    INNER JOIN conversation_members cm_self
      ON cm_self.conversation_id = c.id
      AND cm_self.user_id = $1
    INNER JOIN conversation_members cm
      ON cm.conversation_id = c.id
    INNER JOIN users u
      ON u.id = cm.user_id
    LEFT JOIN LATERAL (
      SELECT id, sender_user_id, body, created_at
      FROM messages
      WHERE conversation_id = c.id
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON TRUE
    WHERE c.id = $2
    GROUP BY c.id, c.type, c.created_at, lm.id, lm.sender_user_id, lm.body, lm.created_at
    LIMIT 1
    `,
    [userId, conversationId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapConversationRow(result.rows[0]);
}

export async function listConversationsForUser(userId: string, db: DbClient = pool): Promise<Conversation[]> {
  const result = await db.query<ConversationRow>(
    `
    SELECT
      c.id,
      c.type,
      c.created_at,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', u.id,
          'nickname', u.nickname,
          'status', u.status
        )
        ORDER BY u.nickname
      ) AS members,
      lm.id AS last_message_id,
      lm.sender_user_id AS last_message_sender_user_id,
      lm.body AS last_message_body,
      lm.created_at AS last_message_created_at
    FROM conversations c
    INNER JOIN conversation_members cm_self
      ON cm_self.conversation_id = c.id
      AND cm_self.user_id = $1
    INNER JOIN conversation_members cm
      ON cm.conversation_id = c.id
    INNER JOIN users u
      ON u.id = cm.user_id
    LEFT JOIN LATERAL (
      SELECT id, sender_user_id, body, created_at
      FROM messages
      WHERE conversation_id = c.id
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON TRUE
    GROUP BY c.id, c.type, c.created_at, lm.id, lm.sender_user_id, lm.body, lm.created_at
    ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `,
    [userId]
  );

  return result.rows.map(mapConversationRow);
}

export async function getConversationForUser(userId: string, conversationId: string): Promise<Conversation> {
  const conversation = await fetchConversationByIdForUser(userId, conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  return conversation;
}

export async function createOrGetDirectConversation(userId: string, otherUserId: string): Promise<Conversation> {
  if (userId === otherUserId) {
    throw new ApiError(400, "Cannot create a conversation with yourself", "INVALID_CONVERSATION");
  }

  const otherUser = await findUserById(otherUserId);
  if (!otherUser || otherUser.status !== "active") {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  return withTransaction(async (client) => {
    // Lock pair creation to avoid duplicate direct conversations in concurrent requests.
    await client.query(
      `
      SELECT pg_advisory_xact_lock(
        hashtextextended(CONCAT(LEAST($1::text, $2::text), ':', GREATEST($1::text, $2::text)), 0)
      )
      `,
      [userId, otherUserId]
    );

    const existing = await client.query<{ id: string }>(
      `
      SELECT c.id
      FROM conversations c
      INNER JOIN conversation_members cm_self
        ON cm_self.conversation_id = c.id
        AND cm_self.user_id = $1
      INNER JOIN conversation_members cm_other
        ON cm_other.conversation_id = c.id
        AND cm_other.user_id = $2
      WHERE c.type = 'direct'
      LIMIT 1
      `,
      [userId, otherUserId]
    );

    if (existing.rowCount && existing.rows[0]) {
      const foundConversation = await fetchConversationByIdForUser(userId, existing.rows[0].id, client);
      if (!foundConversation) {
        throw new ApiError(500, "Failed to load conversation", "INTERNAL_SERVER_ERROR");
      }

      return foundConversation;
    }

    const insertedConversation = await client.query<{ id: string }>(
      `
      INSERT INTO conversations (type)
      VALUES ('direct')
      RETURNING id
      `
    );

    const conversationId = insertedConversation.rows[0].id;

    await client.query(
      `
      INSERT INTO conversation_members (conversation_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
      [conversationId, userId, otherUserId]
    );

    const createdConversation = await fetchConversationByIdForUser(userId, conversationId, client);
    if (!createdConversation) {
      throw new ApiError(500, "Failed to create conversation", "INTERNAL_SERVER_ERROR");
    }

    return createdConversation;
  });
}
