import { database } from "@repo/database";

/**
 * Notification Guard Service
 *
 * Controls whether notifications should be sent based on workspace state.
 * When a workspace is unpublished (draft mode), notifications are suppressed
 * to allow admins to set up workspaces without disturbing users.
 */
export const notificationGuard = {
  /**
   * Check if notifications should be sent for a workspace
   * Returns true only if the workspace is published
   */
  async shouldNotify(workspaceId: string): Promise<boolean> {
    const workspace = await database
      .selectFrom("workspace")
      .select("isPublished")
      .where("id", "=", workspaceId)
      .executeTakeFirst();

    return workspace?.isPublished ?? false;
  },

  /**
   * Check if notifications should be sent for a task (by task ID)
   * Looks up the workspace through section -> workspace
   */
  async shouldNotifyForTask(taskId: string): Promise<boolean> {
    const result = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select("workspace.isPublished")
      .where("task.id", "=", taskId)
      .executeTakeFirst();

    return result?.isPublished ?? false;
  },
};
