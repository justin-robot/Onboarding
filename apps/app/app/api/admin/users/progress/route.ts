import { database } from "@repo/database";
import { sql } from "kysely";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/users/progress - Get all users with their task progress metrics
 */
export async function GET(_request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    // Get all users with aggregated stats
    const users = await database
      .selectFrom("user")
      .select([
        "user.id",
        "user.name",
        "user.email",
        "user.role",
        "user.createdAt",
      ])
      .select((eb) => [
        // Count of workspaces user is a member of
        eb
          .selectFrom("workspace_member")
          .select((eb2) => eb2.fn.count("workspace_member.id").as("count"))
          .whereRef("workspace_member.userId", "=", "user.id")
          .as("workspaceCount"),
        // Total tasks assigned
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .whereRef("task_assignee.userId", "=", "user.id")
          .where("task.deletedAt", "is", null)
          .as("totalTasks"),
        // Completed tasks
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .whereRef("task_assignee.userId", "=", "user.id")
          .where("task_assignee.status", "=", "completed")
          .where("task.deletedAt", "is", null)
          .as("completedTasks"),
        // Overdue tasks (assigned, not completed, past due date)
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .whereRef("task_assignee.userId", "=", "user.id")
          .where("task_assignee.status", "!=", "completed")
          .where("task.deletedAt", "is", null)
          .where("task.dueDateValue", "is not", null)
          .where("task.dueDateValue", "<", new Date())
          .as("overdueTasks"),
      ])
      .orderBy("user.name", "asc")
      .execute();

    // Get last activity for each user (most recent task completion)
    const lastActivities = await database
      .selectFrom("task_assignee")
      .select([
        "task_assignee.userId",
        sql<Date>`MAX(task_assignee."completedAt")`.as("lastActivity"),
      ])
      .where("task_assignee.completedAt", "is not", null)
      .groupBy("task_assignee.userId")
      .execute();

    // Create a map for quick lookup
    const lastActivityMap = new Map(
      lastActivities.map((a) => [a.userId, a.lastActivity])
    );

    // Format the response
    const usersWithProgress = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      workspaceCount: Number(u.workspaceCount || 0),
      totalTasks: Number(u.totalTasks || 0),
      completedTasks: Number(u.completedTasks || 0),
      overdueTasks: Number(u.overdueTasks || 0),
      lastActivity: lastActivityMap.get(u.id) || null,
    }));

    return json({ data: usersWithProgress });
  });
}
