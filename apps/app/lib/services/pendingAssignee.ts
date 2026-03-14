import { database } from "@repo/database";
import type { PendingTaskAssignee } from "@repo/database";
import { assigneeService } from "./assignee";
import { notificationGuard } from "./notificationGuard";
import type { NotificationContext } from "./notificationContext";
import type { AuditContext } from "./auditLog";

// Result type for pending assignment operations
export interface PendingAssignResult {
  success: boolean;
  pendingAssignee?: PendingTaskAssignee;
  error?: "TASK_NOT_FOUND" | "ALREADY_PENDING";
}

// Pending assignee with task info
export interface PendingAssigneeWithTask extends PendingTaskAssignee {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  workspaceName: string;
}

export const pendingAssigneeService = {
  /**
   * Create a pending task assignment for an email
   */
  async create(
    taskId: string,
    email: string,
    createdBy: string
  ): Promise<PendingAssignResult> {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Verify task exists
    const task = await database
      .selectFrom("task")
      .select("id")
      .where("id", "=", taskId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!task) {
      return { success: false, error: "TASK_NOT_FOUND" };
    }

    // Check for existing pending assignment
    const existing = await database
      .selectFrom("pending_task_assignee")
      .selectAll()
      .where("taskId", "=", taskId)
      .where("email", "=", normalizedEmail)
      .executeTakeFirst();

    if (existing) {
      return { success: false, error: "ALREADY_PENDING" };
    }

    // Create pending assignment
    const pendingAssignee = await database
      .insertInto("pending_task_assignee")
      .values({
        taskId,
        email: normalizedEmail,
        createdBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { success: true, pendingAssignee };
  },

  /**
   * Get all pending assignees for a task
   */
  async getByTaskId(taskId: string): Promise<PendingTaskAssignee[]> {
    return database
      .selectFrom("pending_task_assignee")
      .selectAll()
      .where("taskId", "=", taskId)
      .execute();
  },

  /**
   * Get all pending assignments for an email address
   */
  async getByEmail(email: string): Promise<PendingTaskAssignee[]> {
    const normalizedEmail = email.toLowerCase().trim();
    return database
      .selectFrom("pending_task_assignee")
      .selectAll()
      .where("email", "=", normalizedEmail)
      .execute();
  },

  /**
   * Get pending assignments for an email in a specific workspace
   */
  async getByEmailInWorkspace(
    email: string,
    workspaceId: string
  ): Promise<PendingAssigneeWithTask[]> {
    const normalizedEmail = email.toLowerCase().trim();
    return database
      .selectFrom("pending_task_assignee")
      .innerJoin("task", "task.id", "pending_task_assignee.taskId")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .selectAll("pending_task_assignee")
      .select([
        "task.title as taskTitle",
        "section.workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("pending_task_assignee.email", "=", normalizedEmail)
      .where("section.workspaceId", "=", workspaceId)
      .where("task.deletedAt", "is", null)
      .execute() as Promise<PendingAssigneeWithTask[]>;
  },

  /**
   * Delete a pending assignment
   */
  async delete(id: string): Promise<boolean> {
    const result = await database
      .deleteFrom("pending_task_assignee")
      .where("id", "=", id)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Delete a pending assignment by task and email
   */
  async deleteByTaskAndEmail(taskId: string, email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const result = await database
      .deleteFrom("pending_task_assignee")
      .where("taskId", "=", taskId)
      .where("email", "=", normalizedEmail)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Convert a single pending assignment to a real assignment
   * Used when a user joins the workspace
   */
  async convertToRealAssignment(
    pendingId: string,
    userId: string,
    notificationContext?: NotificationContext,
    auditContext?: AuditContext
  ): Promise<boolean> {
    // Get the pending assignment
    const pending = await database
      .selectFrom("pending_task_assignee")
      .selectAll()
      .where("id", "=", pendingId)
      .executeTakeFirst();

    if (!pending) {
      return false;
    }

    // Create real assignment
    const result = await assigneeService.assign(
      pending.taskId,
      userId,
      notificationContext,
      auditContext
    );

    if (result.success) {
      // Delete the pending assignment
      await this.delete(pendingId);
      return true;
    }

    // If already assigned, just delete the pending
    if (result.error === "ALREADY_ASSIGNED") {
      await this.delete(pendingId);
      return true;
    }

    return false;
  },

  /**
   * Process all pending assignments for a user after they join a workspace
   * Called after invitation redemption
   */
  async processForUser(
    email: string,
    userId: string,
    workspaceId: string,
    notificationContext?: NotificationContext,
    auditContext?: AuditContext
  ): Promise<{ converted: number; failed: number }> {
    // Get all pending assignments for this email in this workspace
    const pendingAssignments = await this.getByEmailInWorkspace(email, workspaceId);

    let converted = 0;
    let failed = 0;

    for (const pending of pendingAssignments) {
      const success = await this.convertToRealAssignment(
        pending.id,
        userId,
        notificationContext,
        auditContext
      );

      if (success) {
        converted++;
      } else {
        failed++;
      }
    }

    return { converted, failed };
  },
};
