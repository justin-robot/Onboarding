import { database } from "@repo/database";
import { sql } from "kysely";
import { json, requireAdminAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/users/progress - Get users with task progress (scoped by admin access)
 */
export async function GET(_request: NextRequest) {
  return withErrorHandler(async () => {
    const { workspaceIds, isPlatformAdmin } = await requireAdminAuth();

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [] });
    }

    // Build the base query
    let usersQuery = database
      .selectFrom("user")
      .select([
        "user.id",
        "user.name",
        "user.email",
        "user.role",
        "user.createdAt",
      ]);

    // For workspace admins, only show users who are members of their workspaces
    if (!isPlatformAdmin && workspaceIds !== null) {
      usersQuery = usersQuery.where((eb) =>
        eb.exists(
          eb
            .selectFrom("workspace_member")
            .select(sql`1`.as("one"))
            .whereRef("workspace_member.userId", "=", "user.id")
            .where("workspace_member.workspaceId", "in", workspaceIds)
        )
      );
    }

    // Add subqueries for stats - these need to be scoped too
    const users = await usersQuery
      .select((eb) => [
        // Count of workspaces user is a member of (scoped)
        isPlatformAdmin
          ? eb
              .selectFrom("workspace_member")
              .select((eb2) => eb2.fn.count("workspace_member.id").as("count"))
              .whereRef("workspace_member.userId", "=", "user.id")
              .as("workspaceCount")
          : eb
              .selectFrom("workspace_member")
              .select((eb2) => eb2.fn.count("workspace_member.id").as("count"))
              .whereRef("workspace_member.userId", "=", "user.id")
              .where("workspace_member.workspaceId", "in", workspaceIds!)
              .as("workspaceCount"),
        // Total tasks assigned (scoped)
        isPlatformAdmin
          ? eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task.deletedAt", "is", null)
              .as("totalTasks")
          : eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .innerJoin("section", "section.id", "task.sectionId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task.deletedAt", "is", null)
              .where("section.workspaceId", "in", workspaceIds!)
              .as("totalTasks"),
        // Completed tasks (scoped)
        isPlatformAdmin
          ? eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task_assignee.status", "=", "completed")
              .where("task.deletedAt", "is", null)
              .as("completedTasks")
          : eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .innerJoin("section", "section.id", "task.sectionId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task_assignee.status", "=", "completed")
              .where("task.deletedAt", "is", null)
              .where("section.workspaceId", "in", workspaceIds!)
              .as("completedTasks"),
        // Overdue tasks (scoped)
        isPlatformAdmin
          ? eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task_assignee.status", "!=", "completed")
              .where("task.deletedAt", "is", null)
              .where("task.dueDateValue", "is not", null)
              .where("task.dueDateValue", "<", new Date())
              .as("overdueTasks")
          : eb
              .selectFrom("task_assignee")
              .innerJoin("task", "task.id", "task_assignee.taskId")
              .innerJoin("section", "section.id", "task.sectionId")
              .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
              .whereRef("task_assignee.userId", "=", "user.id")
              .where("task_assignee.status", "!=", "completed")
              .where("task.deletedAt", "is", null)
              .where("task.dueDateValue", "is not", null)
              .where("task.dueDateValue", "<", new Date())
              .where("section.workspaceId", "in", workspaceIds!)
              .as("overdueTasks"),
      ])
      .orderBy("user.name", "asc")
      .execute();

    // Get last activity for each user (most recent task completion - scoped)
    // Build last activity query with proper scoping
    const lastActivities = !isPlatformAdmin && workspaceIds !== null
      ? await database
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .innerJoin("section", "section.id", "task.sectionId")
          .select([
            "task_assignee.userId",
            sql<Date>`MAX(task_assignee."completedAt")`.as("lastActivity"),
          ])
          .where("task_assignee.completedAt", "is not", null)
          .where("section.workspaceId", "in", workspaceIds)
          .groupBy("task_assignee.userId")
          .execute()
      : await database
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
