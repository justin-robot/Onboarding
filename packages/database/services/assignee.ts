import { database } from "../index";
import { memberService } from "./member";
import type { TaskAssignee } from "../schemas/main";
import type { NotificationContext } from "./notificationContext";

// Result type for assignment operations
export interface AssignResult {
  success: boolean;
  assignee?: TaskAssignee;
  error?: "NOT_WORKSPACE_MEMBER" | "ALREADY_ASSIGNED" | "TASK_NOT_FOUND";
}

export const assigneeService = {
  /**
   * Assign a user to a task
   * Validates that user is a member of the task's workspace
   */
  async assign(
    taskId: string,
    userId: string,
    notificationContext?: NotificationContext
  ): Promise<AssignResult> {
    // Get task and its workspace with names for notifications
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
      .where("task.id", "=", taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!taskWithWorkspace) {
      return { success: false, error: "TASK_NOT_FOUND" };
    }

    // Check if user is a workspace member
    const isMember = await memberService.isMember(taskWithWorkspace.workspaceId, userId);
    if (!isMember) {
      return { success: false, error: "NOT_WORKSPACE_MEMBER" };
    }

    // Check for existing assignment
    const existing = await database
      .selectFrom("task_assignee")
      .selectAll()
      .where("taskId", "=", taskId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    if (existing) {
      return { success: false, error: "ALREADY_ASSIGNED" };
    }

    // Create assignment
    const assignee = await database
      .insertInto("task_assignee")
      .values({
        taskId,
        userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Trigger notification
    if (notificationContext) {
      await notificationContext.triggerWorkflow({
        workflowId: "task-assigned",
        recipientId: userId,
        data: {
          workspaceId: taskWithWorkspace.workspaceId,
          workspaceName: taskWithWorkspace.workspaceName,
          taskId: taskWithWorkspace.id,
          taskTitle: taskWithWorkspace.title,
        },
        tenant: taskWithWorkspace.workspaceId,
      });
    }

    return { success: true, assignee };
  },

  /**
   * Remove a user's assignment from a task
   */
  async unassign(taskId: string, userId: string): Promise<boolean> {
    const result = await database
      .deleteFrom("task_assignee")
      .where("taskId", "=", taskId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Get all assignees for a task
   */
  async getByTaskId(taskId: string): Promise<TaskAssignee[]> {
    return database
      .selectFrom("task_assignee")
      .selectAll()
      .where("taskId", "=", taskId)
      .execute();
  },

  /**
   * Get all task assignments for a user
   */
  async getTasksForUser(userId: string): Promise<TaskAssignee[]> {
    return database
      .selectFrom("task_assignee")
      .selectAll()
      .where("userId", "=", userId)
      .execute();
  },

  /**
   * Check if a user is assigned to a task
   */
  async isAssigned(taskId: string, userId: string): Promise<boolean> {
    const assignee = await database
      .selectFrom("task_assignee")
      .selectAll()
      .where("taskId", "=", taskId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return assignee !== undefined;
  },
};
