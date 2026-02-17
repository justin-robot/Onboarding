import { database } from "@repo/database";
import { dependencyService } from "./dependency";
import type { NotificationContext } from "./notificationContext";

export const cascadeService = {
  /**
   * Called when a task is completed.
   * Calculates and sets due dates for date_anchor/both dependent tasks.
   */
  async onTaskCompleted(taskId: string): Promise<void> {
    // Get the completed task to get its completedAt
    const task = await database
      .selectFrom("task")
      .select(["id", "completedAt"])
      .where("id", "=", taskId)
      .executeTakeFirst();

    if (!task?.completedAt) {
      return;
    }

    // Find all tasks that depend on this task with date_anchor or both type
    const dependents = await database
      .selectFrom("task_dependency")
      .select(["taskId", "offsetDays"])
      .where("dependsOnTaskId", "=", taskId)
      .where("type", "in", ["date_anchor", "both"])
      .execute();

    // Update due dates for each dependent
    for (const dep of dependents) {
      const offsetDays = dep.offsetDays ?? 0;
      const dueDate = new Date(task.completedAt);
      dueDate.setDate(dueDate.getDate() + offsetDays);

      await database
        .updateTable("task")
        .set({
          dueDateValue: dueDate,
          dueDateType: "absolute",
          updatedAt: new Date(),
        })
        .where("id", "=", dep.taskId)
        .execute();
    }
  },

  /**
   * Called when a task is reopened (status changed from completed to not_started/in_progress).
   * Nulls out due dates for date_anchor/both dependent tasks and cascades.
   */
  async onTaskReopened(taskId: string): Promise<void> {
    await this.cascadeNullDueDates(taskId);
  },

  /**
   * Called when a task is deleted.
   * Nulls out due dates for dependents, removes dependencies, and cascades.
   * Optionally notifies admins about cleared due dates.
   */
  async onTaskDeleted(
    taskId: string,
    notificationContext?: NotificationContext
  ): Promise<void> {
    // Get the deleted task's info for notifications
    const deletedTask = await database
      .selectFrom("task")
      .select(["id", "title"])
      .where("id", "=", taskId)
      .executeTakeFirst();

    // Find all tasks that depend on this task with date_anchor or both type
    const dependents = await database
      .selectFrom("task_dependency")
      .innerJoin("task", "task.id", "task_dependency.taskId")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task_dependency.id",
        "task_dependency.taskId",
        "task.title as taskTitle",
        "section.workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task_dependency.dependsOnTaskId", "=", taskId)
      .where("task_dependency.type", "in", ["date_anchor", "both"])
      .execute();

    // Null out due dates and cascade for each dependent
    for (const dep of dependents) {
      await database
        .updateTable("task")
        .set({
          dueDateValue: null,
          updatedAt: new Date(),
        })
        .where("id", "=", dep.taskId)
        .execute();

      // Send due-date-cleared notification to workspace admins
      if (notificationContext) {
        try {
          // Get workspace admins
          const admins = await database
            .selectFrom("workspace_member")
            .select("userId")
            .where("workspaceId", "=", dep.workspaceId)
            .where("role", "=", "admin")
            .execute();

          for (const admin of admins) {
            await notificationContext.triggerWorkflow({
              workflowId: "due-date-cleared",
              recipientId: admin.userId,
              data: {
                workspaceId: dep.workspaceId,
                workspaceName: dep.workspaceName,
                taskId: dep.taskId,
                taskTitle: dep.taskTitle,
                reason: deletedTask
                  ? `Anchor task "${deletedTask.title}" was deleted`
                  : "Anchor task was deleted",
              },
              tenant: dep.workspaceId,
            });
          }
        } catch (err) {
          console.error("Failed to send due-date-cleared notification:", err);
        }
      }

      // Recursively cascade null due dates
      await this.cascadeNullDueDates(dep.taskId);
    }

    // Remove all dependencies where this task is the prerequisite
    await database
      .deleteFrom("task_dependency")
      .where("dependsOnTaskId", "=", taskId)
      .execute();
  },

  /**
   * Recursively nulls out due dates for tasks that depend on the given task
   * via date_anchor or both dependencies.
   */
  async cascadeNullDueDates(taskId: string): Promise<void> {
    // Find all tasks that depend on this task with date_anchor or both type
    const dependents = await database
      .selectFrom("task_dependency")
      .select(["taskId"])
      .where("dependsOnTaskId", "=", taskId)
      .where("type", "in", ["date_anchor", "both"])
      .execute();

    // Null out due dates and recurse for each dependent
    for (const dep of dependents) {
      await database
        .updateTable("task")
        .set({
          dueDateValue: null,
          updatedAt: new Date(),
        })
        .where("id", "=", dep.taskId)
        .execute();

      // Recursively cascade
      await this.cascadeNullDueDates(dep.taskId);
    }
  },
};
