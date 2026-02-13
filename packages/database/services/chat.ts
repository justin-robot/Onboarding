import { database } from "../index";
import type { Message, NewMessage, MessageType } from "../schemas/main";

// Dynamically import ably to avoid bundling issues with Next.js
// Uses string variable to prevent static analysis by bundler
const ABLY_PATH = "./ably";
async function getAblyService() {
  if (typeof window !== "undefined") return null; // Client-side guard
  try {
    const module = await import(/* webpackIgnore: true */ ABLY_PATH);
    return { ablyService: module.ablyService, CHAT_EVENTS: module.CHAT_EVENTS };
  } catch {
    return null;
  }
}

// Options for sending a message
export interface SendMessageOptions {
  workspaceId: string;
  userId: string;
  content: string;
  type?: MessageType;
  attachmentIds?: string[];
  referencedTaskId?: string;
  referencedFileId?: string;
}

// Message with user info
export interface MessageWithUser extends Message {
  userName?: string;
  userImage?: string;
}

// Pagination cursor (base64 encoded createdAt timestamp)
export interface MessageCursor {
  createdAt: Date;
  id: string;
}

// Paginated result
export interface PaginatedMessages {
  messages: MessageWithUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Default page size
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Encode a cursor from message data
 */
function encodeCursor(message: Message): string {
  const cursor: MessageCursor = {
    createdAt: message.createdAt,
    id: message.id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * Decode a cursor string
 */
function decodeCursor(cursorString: string): MessageCursor | null {
  try {
    const json = Buffer.from(cursorString, "base64").toString("utf-8");
    const cursor = JSON.parse(json);
    return {
      createdAt: new Date(cursor.createdAt),
      id: cursor.id,
    };
  } catch {
    return null;
  }
}

export const chatService = {
  /**
   * Send a message to a workspace chat
   */
  async sendMessage(options: SendMessageOptions): Promise<Message> {
    const message = await database
      .insertInto("message")
      .values({
        workspaceId: options.workspaceId,
        userId: options.userId,
        content: options.content,
        type: options.type || "text",
        attachmentIds: options.attachmentIds || null,
        referencedTaskId: options.referencedTaskId || null,
        referencedFileId: options.referencedFileId || null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Broadcast to chat channel (fire and forget)
    getAblyService().then((ably) => {
      if (ably) {
        ably.ablyService.broadcastToChat(options.workspaceId, ably.CHAT_EVENTS.MESSAGE_SENT, {
          id: message.id,
          workspaceId: message.workspaceId,
          userId: message.userId,
          content: message.content,
          type: message.type,
          attachmentIds: message.attachmentIds,
          referencedTaskId: message.referencedTaskId,
          referencedFileId: message.referencedFileId,
          createdAt: message.createdAt,
        }).catch((err) => console.error("Failed to broadcast message:", err));
      }
    });

    return message;
  },

  /**
   * Send a system message (no user context)
   */
  async sendSystemMessage(
    workspaceId: string,
    content: string,
    referencedTaskId?: string
  ): Promise<Message> {
    // System messages use a special system user ID
    return this.sendMessage({
      workspaceId,
      userId: "system",
      content,
      type: "system",
      referencedTaskId,
    });
  },

  /**
   * Get messages for a workspace with cursor-based pagination
   * Returns messages in reverse chronological order (newest first)
   */
  async getMessages(
    workspaceId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedMessages> {
    // Clamp limit
    const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
    // Fetch one extra to determine if there are more
    const fetchLimit = safeLimit + 1;

    let query = database
      .selectFrom("message")
      .leftJoin("user", "user.id", "message.userId")
      .select([
        "message.id",
        "message.workspaceId",
        "message.userId",
        "message.content",
        "message.type",
        "message.attachmentIds",
        "message.referencedTaskId",
        "message.referencedFileId",
        "message.deletedAt",
        "message.createdAt",
        "message.updatedAt",
        "user.name as userName",
        "user.image as userImage",
      ])
      .where("message.workspaceId", "=", workspaceId)
      .where("message.deletedAt", "is", null)
      .orderBy("message.createdAt", "desc")
      .orderBy("message.id", "desc")
      .limit(fetchLimit);

    // Apply cursor if provided
    if (cursor) {
      const decodedCursor = decodeCursor(cursor);
      if (decodedCursor) {
        // Get messages older than the cursor
        query = query.where((eb) =>
          eb.or([
            eb("message.createdAt", "<", decodedCursor.createdAt),
            eb.and([
              eb("message.createdAt", "=", decodedCursor.createdAt),
              eb("message.id", "<", decodedCursor.id),
            ]),
          ])
        );
      }
    }

    const results = await query.execute();

    // Check if there are more messages
    const hasMore = results.length > safeLimit;
    const messages = hasMore ? results.slice(0, safeLimit) : results;

    // Generate next cursor from the last message
    const nextCursor =
      hasMore && messages.length > 0
        ? encodeCursor(messages[messages.length - 1] as Message)
        : null;

    return {
      messages: messages as MessageWithUser[],
      nextCursor,
      hasMore,
    };
  },

  /**
   * Get a message by ID
   */
  async getById(id: string): Promise<Message | null> {
    const message = await database
      .selectFrom("message")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return message ?? null;
  },

  /**
   * Update a message
   */
  async updateMessage(
    id: string,
    content: string,
    userId: string
  ): Promise<Message | null> {
    // Only allow updating own messages
    const message = await database
      .updateTable("message")
      .set({
        content,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("userId", "=", userId)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (message) {
      // Broadcast update (fire and forget)
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToChat(message.workspaceId, ably.CHAT_EVENTS.MESSAGE_UPDATED, {
            id: message.id,
            content: message.content,
            updatedAt: message.updatedAt,
          }).catch((err) => console.error("Failed to broadcast message update:", err));
        }
      });
    }

    return message ?? null;
  },

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(id: string, userId: string): Promise<boolean> {
    // Get message first for broadcast
    const existing = await this.getById(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }

    const result = await database
      .updateTable("message")
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("userId", "=", userId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const deleted = (result.numUpdatedRows ?? 0n) > 0n;

    if (deleted) {
      // Broadcast deletion (fire and forget)
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToChat(existing.workspaceId, ably.CHAT_EVENTS.MESSAGE_DELETED, {
            id,
          }).catch((err) => console.error("Failed to broadcast message deletion:", err));
        }
      });
    }

    return deleted;
  },

  /**
   * Get message count for a workspace
   */
  async getMessageCount(workspaceId: string): Promise<number> {
    const result = await database
      .selectFrom("message")
      .select((eb) => eb.fn.count("id").as("count"))
      .where("workspaceId", "=", workspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  },

  /**
   * Get recent messages (for notifications or previews)
   */
  async getRecentMessages(
    workspaceId: string,
    limit: number = 10
  ): Promise<Message[]> {
    return database
      .selectFrom("message")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("deletedAt", "is", null)
      .orderBy("createdAt", "desc")
      .limit(Math.min(limit, 50))
      .execute();
  },

  /**
   * Get messages referencing a specific task
   */
  async getMessagesByTaskId(taskId: string): Promise<Message[]> {
    return database
      .selectFrom("message")
      .selectAll()
      .where("referencedTaskId", "=", taskId)
      .where("deletedAt", "is", null)
      .orderBy("createdAt", "asc")
      .execute();
  },
};
