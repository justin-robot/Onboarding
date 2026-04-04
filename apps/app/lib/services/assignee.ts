import { database } from "@repo/database";
import { memberService } from "./member";
import { auditLogService, type AuditContext } from "./auditLog";
import { notificationGuard } from "./notificationGuard";
import type { TaskAssignee } from "@repo/database";
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
    notificationContext?: NotificationContext,
    auditContext?: AuditContext
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

    // Check if task is completed - if so, reopen it
    const task = await database
      .selectFrom("task")
      .select(["status"])
      .where("id", "=", taskId)
      .executeTakeFirst();

    const wasCompleted = task?.status === "completed";

    if (wasCompleted) {
      await database
        .updateTable("task")
        .set({
          status: "in_progress",
          completedAt: null,
          updatedAt: new Date(),
        })
        .where("id", "=", taskId)
        .execute();
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

    // Get assignee's name for audit log
    const assigneeUser = await database
      .selectFrom("user")
      .select(["name", "email"])
      .where("id", "=", userId)
      .executeTakeFirst();

    // Log audit events
    if (auditContext) {
      // Log task reopened if it was completed
      if (wasCompleted) {
        await auditLogService.logEvent({
          workspaceId: taskWithWorkspace.workspaceId,
          eventType: "task.reopened",
          actorId: auditContext.actorId,
          taskId,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
          metadata: {
            taskTitle: taskWithWorkspace.title,
            reason: "assignee_added",
          },
        });
      }

      // Log assignment
      await auditLogService.logEvent({
        workspaceId: taskWithWorkspace.workspaceId,
        eventType: "task.assigned",
        actorId: auditContext.actorId,
        taskId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: {
          taskTitle: taskWithWorkspace.title,
          taskType: "task",
          targetName: assigneeUser?.name || assigneeUser?.email || "Unknown",
          targetUserId: userId,
        },
      });
    }

    // Trigger notification (only if workspace is published)
    if (notificationContext) {
      const shouldNotify = await notificationGuard.shouldNotify(taskWithWorkspace.workspaceId);
      if (shouldNotify) {
        console.log("[assignee] Triggering task-assigned notification for user:", userId);
        const result = await notificationContext.triggerWorkflow({
          workflowId: "task-assigned",
          recipientId: userId,
          recipientName: assigneeUser?.name || undefined,
          recipientEmail: assigneeUser?.email || undefined,
          data: {
            workspaceId: taskWithWorkspace.workspaceId,
            workspaceName: taskWithWorkspace.workspaceName,
            taskId: taskWithWorkspace.id,
            taskTitle: taskWithWorkspace.title,
          },
          tenant: taskWithWorkspace.workspaceId,
        });
        console.log("[assignee] Notification result:", result);
      } else {
        console.log("[assignee] Workspace not published, skipping notification");
      }
    } else {
      console.log("[assignee] No notificationContext provided, skipping notification");
    }

    return { success: true, assignee };
  },

  /**
   * Remove a user's assignment from a task
   */
  async unassign(
    taskId: string,
    userId: string,
    auditContext?: AuditContext
  ): Promise<boolean> {
    // Get task info and assignee name before deleting
    const taskInfo = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["task.title", "task.type", "section.workspaceId"])
      .where("task.id", "=", taskId)
      .executeTakeFirst();

    const assigneeUser = await database
      .selectFrom("user")
      .select(["name", "email"])
      .where("id", "=", userId)
      .executeTakeFirst();

    const result = await database
      .deleteFrom("task_assignee")
      .where("taskId", "=", taskId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    const deleted = (result.numDeletedRows ?? 0n) > 0n;

    // Log audit event
    if (deleted && auditContext && taskInfo) {
      await auditLogService.logEvent({
        workspaceId: taskInfo.workspaceId,
        eventType: "task.unassigned",
        actorId: auditContext.actorId,
        taskId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: {
          taskTitle: taskInfo.title,
          taskType: taskInfo.type,
          targetName: assigneeUser?.name || assigneeUser?.email || "Unknown",
          targetUserId: userId,
        },
      });
    }

    return deleted;
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
   * Get all assignees for a task with their user info (name and completion status)
   */
  async getByTaskIdWithUserInfo(taskId: string): Promise<Array<{ userId: string; name: string; isCompleted: boolean }>> {
    const results = await database
      .selectFrom("task_assignee")
      .innerJoin("user", "user.id", "task_assignee.userId")
      .select(["task_assignee.userId", "task_assignee.status", "user.name", "user.email"])
      .where("task_assignee.taskId", "=", taskId)
      .execute();

    return results.map((r) => ({
      userId: r.userId,
      name: r.name || r.email || "Unknown",
      isCompleted: r.status === "completed",
    }));
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

  /**
   * Assign a task by email address
   * If user exists and is a member of the workspace, assigns directly
   * If user has a pending invitation to the workspace, creates a pending assignment
   * Otherwise rejects the request
   */
  async assignByEmail(
    taskId: string,
    email: string,
    createdBy: string,
    notificationContext?: NotificationContext,
    auditContext?: AuditContext
  ): Promise<{
    success: boolean;
    type: "direct" | "pending";
    error?: string;
  }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Get task's workspace
    const taskWithWorkspace = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["task.id", "section.workspaceId"])
      .where("task.id", "=", taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!taskWithWorkspace) {
      return { success: false, type: "pending", error: "TASK_NOT_FOUND" };
    }

    // Check if user exists with this email
    const user = await database
      .selectFrom("user")
      .select(["id"])
      .where("email", "=", normalizedEmail)
      .executeTakeFirst();

    if (user) {
      // Check if user is a member of the workspace
      const isMember = await memberService.isMember(taskWithWorkspace.workspaceId, user.id);
      if (isMember) {
        // Assign directly
        const result = await this.assign(taskId, user.id, notificationContext, auditContext);
        if (result.success) {
          return { success: true, type: "direct" };
        }
        return { success: false, type: "direct", error: result.error };
      }
    }

    // Check if there's a pending invitation for this email in this workspace
    const pendingInvitation = await database
      .selectFrom("pending_invitation")
      .select(["id"])
      .where("email", "=", normalizedEmail)
      .where("workspaceId", "=", taskWithWorkspace.workspaceId)
      .executeTakeFirst();

    if (!pendingInvitation) {
      return {
        success: false,
        type: "pending",
        error: "User must be a workspace member or have a pending invitation"
      };
    }

    // User has a pending invitation - create pending assignment
    // Import pendingAssigneeService dynamically to avoid circular dependency
    const { pendingAssigneeService } = await import("./pendingAssignee");
    const result = await pendingAssigneeService.create(taskId, normalizedEmail, createdBy);

    if (result.success) {
      return { success: true, type: "pending" };
    }
    return { success: false, type: "pending", error: result.error };
  },
};
