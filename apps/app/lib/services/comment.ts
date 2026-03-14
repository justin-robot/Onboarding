import { database } from "@repo/database";
import type { Comment, NewComment } from "@repo/database";
import type { NotificationContext } from "./notificationContext";
import { notificationGuard } from "./notificationGuard";

// Dynamically import ably to avoid bundling issues with Next.js
const ABLY_PATH = "./ably";
async function getAblyService() {
  if (typeof window !== "undefined") return null;
  try {
    const module = await import(/* webpackIgnore: true */ ABLY_PATH);
    return { ablyService: module.ablyService, WORKSPACE_EVENTS: module.WORKSPACE_EVENTS };
  } catch {
    return null;
  }
}

// Options for creating a comment
export interface CreateCommentOptions {
  taskId: string;
  userId: string;
  content: string;
  notificationContext?: NotificationContext;
}

// Comment with user info
export interface CommentWithUser extends Comment {
  userName?: string;
  userImage?: string;
}

export const commentService = {
  /**
   * Create a new comment on a task
   * Broadcasts via Ably and optionally triggers notifications for other assignees
   */
  async create(options: CreateCommentOptions): Promise<Comment> {
    // Get task with workspace info for notifications and broadcasting
    const taskWithWorkspace = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id",
        "task.title",
        "section.workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task.id", "=", options.taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!taskWithWorkspace) {
      throw new Error("Task not found");
    }

    // Get the commenter's info for broadcasting
    const commenter = await database
      .selectFrom("user")
      .select(["id", "name", "image"])
      .where("id", "=", options.userId)
      .executeTakeFirst();

    // Create the comment
    const comment = await database
      .insertInto("comment")
      .values({
        taskId: options.taskId,
        userId: options.userId,
        content: options.content,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Broadcast comment created event with user info (fire and forget)
    getAblyService().then((ably) => {
      if (ably) {
        ably.ablyService.broadcastToWorkspace(taskWithWorkspace.workspaceId, "comment.created", {
          id: comment.id,
          taskId: comment.taskId,
          userId: comment.userId,
          userName: commenter?.name,
          userImage: commenter?.image,
          content: comment.content,
          createdAt: comment.createdAt,
        }).catch((err: unknown) => console.error("Failed to broadcast comment:", err));
      }
    });

    // Trigger notifications for other task assignees (not the comment author)
    // Only if workspace is published
    if (options.notificationContext) {
      const shouldNotify = await notificationGuard.shouldNotify(taskWithWorkspace.workspaceId);
      if (shouldNotify) {
        // Get all assignees for this task
        const assignees = await database
          .selectFrom("task_assignee")
          .select(["userId"])
          .where("taskId", "=", options.taskId)
          .execute();

        // Notify each assignee except the comment author
        const commentPreview = options.content.length > 100
          ? options.content.substring(0, 100) + "..."
          : options.content;

        for (const assignee of assignees) {
          if (assignee.userId !== options.userId) {
            options.notificationContext.triggerWorkflow({
              workflowId: "comment-added",
              recipientId: assignee.userId,
              data: {
                workspaceId: taskWithWorkspace.workspaceId,
                workspaceName: taskWithWorkspace.workspaceName,
                taskId: taskWithWorkspace.id,
                taskTitle: taskWithWorkspace.title,
                commentBy: commenter?.name || "Someone",
                commentPreview,
              },
              tenant: taskWithWorkspace.workspaceId,
            }).catch((err) => {
              console.error("Failed to trigger comment notification:", err);
            });
          }
        }
      }
    }

    return comment;
  },

  /**
   * Get all comments for a task in chronological order (oldest first)
   */
  async getByTaskId(taskId: string): Promise<CommentWithUser[]> {
    const comments = await database
      .selectFrom("comment")
      .leftJoin("user", "user.id", "comment.userId")
      .select([
        "comment.id",
        "comment.taskId",
        "comment.userId",
        "comment.content",
        "comment.deletedAt",
        "comment.createdAt",
        "comment.updatedAt",
        "user.name as userName",
        "user.image as userImage",
      ])
      .where("comment.taskId", "=", taskId)
      .where("comment.deletedAt", "is", null)
      .orderBy("comment.createdAt", "asc")
      .execute();

    return comments as CommentWithUser[];
  },

  /**
   * Get a comment by ID
   */
  async getById(id: string): Promise<Comment | null> {
    const comment = await database
      .selectFrom("comment")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return comment ?? null;
  },

  /**
   * Delete a comment (soft delete)
   * Only the comment author can delete their own comment
   */
  async delete(id: string, userId: string): Promise<boolean> {
    // Get comment first for broadcast
    const existing = await this.getById(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }

    const result = await database
      .updateTable("comment")
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
      this.getTaskWorkspaceId(existing.taskId).then((workspaceId) => {
        if (workspaceId) {
          getAblyService().then((ably) => {
            if (ably) {
              ably.ablyService.broadcastToWorkspace(workspaceId, "comment.deleted", {
                id,
                taskId: existing.taskId,
              }).catch((err: unknown) => console.error("Failed to broadcast comment deletion:", err));
            }
          });
        }
      });
    }

    return deleted;
  },

  /**
   * Get comment count for a task
   */
  async getCountByTaskId(taskId: string): Promise<number> {
    const result = await database
      .selectFrom("comment")
      .select((eb) => eb.fn.count("id").as("count"))
      .where("taskId", "=", taskId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  },

  /**
   * Helper to get workspace ID from task (for broadcasting)
   */
  async getTaskWorkspaceId(taskId: string): Promise<string | null> {
    const result = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select("section.workspaceId")
      .where("task.id", "=", taskId)
      .executeTakeFirst();

    return result?.workspaceId ?? null;
  },
};
