import { database } from "../index";
import { sql } from "kysely";
import type { NotificationContext } from "./notificationContext";

// Task with due date info for reminders
export interface TaskDueInfo {
  id: string;
  title: string;
  dueDateValue: Date;
  workspaceId: string;
  workspaceName: string;
  assigneeIds: string[];
}

// Result of processing reminders
export interface ReminderResult {
  approaching: number;
  overdue: number;
  notificationsSent: number;
  errors: string[];
}

// Generate deduplication key for Knock
function getDeduplicationKey(taskId: string, eventType: string, date: Date): string {
  const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${taskId}-${eventType}-${dateStr}`;
}

export const dueDateReminderService = {
  /**
   * Find tasks with due dates approaching within the specified hours
   */
  async getApproachingTasks(hoursThreshold: number = 24): Promise<TaskDueInfo[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

    // Find tasks where:
    // - dueDateValue is not null
    // - dueDateValue is between now and threshold
    // - task is not completed
    // - task is not deleted
    const tasks = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id",
        "task.title",
        "task.dueDateValue",
        "section.workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task.dueDateValue", "is not", null)
      .where("task.dueDateValue", ">", now)
      .where("task.dueDateValue", "<=", thresholdDate)
      .where("task.status", "!=", "completed")
      .where("task.deletedAt", "is", null)
      .execute();

    // Get assignees for each task
    const result: TaskDueInfo[] = [];
    for (const task of tasks) {
      const assignees = await database
        .selectFrom("task_assignee")
        .select("userId")
        .where("taskId", "=", task.id)
        .execute();

      result.push({
        id: task.id,
        title: task.title,
        dueDateValue: task.dueDateValue!,
        workspaceId: task.workspaceId,
        workspaceName: task.workspaceName,
        assigneeIds: assignees.map((a) => a.userId),
      });
    }

    return result;
  },

  /**
   * Find tasks with due dates that have passed
   */
  async getOverdueTasks(): Promise<TaskDueInfo[]> {
    const now = new Date();

    // Find tasks where:
    // - dueDateValue is not null
    // - dueDateValue is in the past
    // - task is not completed
    // - task is not deleted
    const tasks = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id",
        "task.title",
        "task.dueDateValue",
        "section.workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task.dueDateValue", "is not", null)
      .where("task.dueDateValue", "<", now)
      .where("task.status", "!=", "completed")
      .where("task.deletedAt", "is", null)
      .execute();

    // Get assignees for each task
    const result: TaskDueInfo[] = [];
    for (const task of tasks) {
      const assignees = await database
        .selectFrom("task_assignee")
        .select("userId")
        .where("taskId", "=", task.id)
        .execute();

      result.push({
        id: task.id,
        title: task.title,
        dueDateValue: task.dueDateValue!,
        workspaceId: task.workspaceId,
        workspaceName: task.workspaceName,
        assigneeIds: assignees.map((a) => a.userId),
      });
    }

    return result;
  },

  /**
   * Process all due date reminders
   * Finds approaching and overdue tasks, triggers notifications
   */
  async processReminders(
    notificationContext: NotificationContext,
    options: { hoursThreshold?: number } = {}
  ): Promise<ReminderResult> {
    const hoursThreshold = options.hoursThreshold ?? 24;
    const result: ReminderResult = {
      approaching: 0,
      overdue: 0,
      notificationsSent: 0,
      errors: [],
    };

    const now = new Date();

    // Process approaching tasks
    const approachingTasks = await this.getApproachingTasks(hoursThreshold);
    result.approaching = approachingTasks.length;

    for (const task of approachingTasks) {
      const hoursRemaining = Math.round(
        (task.dueDateValue.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      for (const assigneeId of task.assigneeIds) {
        try {
          await notificationContext.triggerWorkflow({
            workflowId: "due-date-approaching",
            recipientId: assigneeId,
            data: {
              workspaceId: task.workspaceId,
              workspaceName: task.workspaceName,
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDateValue.toISOString(),
              hoursRemaining,
            },
            tenant: task.workspaceId,
          });
          result.notificationsSent++;
        } catch (error) {
          result.errors.push(
            `Failed to notify ${assigneeId} for task ${task.id}: ${error}`
          );
        }
      }
    }

    // Process overdue tasks
    const overdueTasks = await this.getOverdueTasks();
    result.overdue = overdueTasks.length;

    for (const task of overdueTasks) {
      const hoursOverdue = Math.round(
        (now.getTime() - task.dueDateValue.getTime()) / (1000 * 60 * 60)
      );

      for (const assigneeId of task.assigneeIds) {
        try {
          await notificationContext.triggerWorkflow({
            workflowId: "due-date-passed",
            recipientId: assigneeId,
            data: {
              workspaceId: task.workspaceId,
              workspaceName: task.workspaceName,
              taskId: task.id,
              taskTitle: task.title,
              dueDate: task.dueDateValue.toISOString(),
              hoursOverdue,
            },
            tenant: task.workspaceId,
          });
          result.notificationsSent++;
        } catch (error) {
          result.errors.push(
            `Failed to notify ${assigneeId} for task ${task.id}: ${error}`
          );
        }
      }
    }

    return result;
  },

  /**
   * Get deduplication key for a task reminder
   * Use this when triggering Knock to prevent duplicate notifications
   */
  getDeduplicationKey,
};
