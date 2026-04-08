import { pool, type DbClient } from "../db";
import { ApiError } from "../lib/errors";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_nickname: string;
  body: string;
  created_at: Date;
  edited_at: Date | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderNickname: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
};

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderUserId: row.sender_user_id,
    senderNickname: row.sender_nickname,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    editedAt: row.edited_at ? row.edited_at.toISOString() : null
  };
}

async function isConversationMember(
  conversationId: string,
  userId: string,
  db: DbClient = pool
): Promise<boolean> {
  const result = await db.query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM conversation_members
      WHERE conversation_id = $1
        AND user_id = $2
    ) AS exists
    `,
    [conversationId, userId]
  );

  return result.rows[0]?.exists ?? false;
}

export async function listMessagesByConversation(
  input: { conversationId: string; requesterUserId: string; before?: string; limit: number },
  db: DbClient = pool
): Promise<Message[]> {
  const member = await isConversationMember(input.conversationId, input.requesterUserId, db);
  if (!member) {
    throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  const beforeDate = input.before ? new Date(input.before) : null;

  const result = await db.query<MessageRow>(
    `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_user_id,
      u.nickname AS sender_nickname,
      m.body,
      m.created_at,
      m.edited_at
    FROM messages m
    INNER JOIN users u ON u.id = m.sender_user_id
    WHERE m.conversation_id = $1
      AND m.deleted_at IS NULL
      AND ($2::timestamptz IS NULL OR m.created_at < $2)
    ORDER BY m.created_at DESC
    LIMIT $3
    `,
    [input.conversationId, beforeDate, input.limit]
  );

  return result.rows.map(mapMessageRow).reverse();
}

export async function sendMessageToConversation(
  input: { conversationId: string; senderUserId: string; body: string },
  db: DbClient = pool
): Promise<Message> {
  const member = await isConversationMember(input.conversationId, input.senderUserId, db);
  if (!member) {
    throw new ApiError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  const result = await db.query<MessageRow>(
    `
    INSERT INTO messages (conversation_id, sender_user_id, body)
    VALUES ($1, $2, $3)
    RETURNING id, conversation_id, sender_user_id, body, created_at, edited_at,
      (SELECT nickname FROM users WHERE id = sender_user_id) AS sender_nickname
    `,
    [input.conversationId, input.senderUserId, input.body]
  );

  return mapMessageRow(result.rows[0]);
}
