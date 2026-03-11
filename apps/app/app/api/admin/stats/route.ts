import { database } from "@repo/database";
import { sql } from "kysely";
import { json, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";

/**
 * GET /api/admin/stats - Get dashboard statistics (scoped by admin access)
 */
export async function GET() {
  return withErrorHandler(async () => {
    const { workspaceIds, isPlatformAdmin } = await requireAdminAuth();

    // If user has no admin workspaces, return zeros
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({
        users: { total: 0 },
        workspaces: { total: 0 },
        tasks: { total: 0, byStatus: {} },
        invitations: { pending: 0 },
        members: { total: 0 },
      });
    }

    // Get user stats (only platform admins see all users)
    let userTotal = 0;
    if (isPlatformAdmin) {
      const userStats = await database
        .selectFrom("user")
        .select((eb) => [eb.fn.count("id").as("total")])
        .executeTakeFirst();
      userTotal = Number(userStats?.total || 0);
    } else {
      // Workspace admins see unique users in their workspaces
      const userStats = await database
        .selectFrom("workspace_member")
        .select(sql<number>`COUNT(DISTINCT "userId")`.as("total"))
        .where("workspaceId", "in", workspaceIds!)
        .executeTakeFirst();
      userTotal = Number(userStats?.total || 0);
    }

    // Get workspace stats
    let workspaceQuery = database
      .selectFrom("workspace")
      .select((eb) => [eb.fn.count("id").as("total")])
      .where("deletedAt", "is", null);

    if (workspaceIds !== null) {
      workspaceQuery = workspaceQuery.where("id", "in", workspaceIds);
    }

    const workspaceStats = await workspaceQuery.executeTakeFirst();

    // Get task stats
    let taskQuery = database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select((eb) => [eb.fn.count("task.id").as("total")])
      .where("task.deletedAt", "is", null);

    if (workspaceIds !== null) {
      taskQuery = taskQuery.where("section.workspaceId", "in", workspaceIds);
    }

    const taskStats = await taskQuery.executeTakeFirst();

    // Get tasks by status
    let tasksByStatusQuery = database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["task.status", (eb) => eb.fn.count("task.id").as("count")])
      .where("task.deletedAt", "is", null)
      .groupBy("task.status");

    if (workspaceIds !== null) {
      tasksByStatusQuery = tasksByStatusQuery.where("section.workspaceId", "in", workspaceIds);
    }

    const tasksByStatus = await tasksByStatusQuery.execute();

    // Get pending invitations count
    let invitationQuery = database
      .selectFrom("pending_invitation")
      .select((eb) => [eb.fn.count("id").as("total")])
      .where("expiresAt", ">", new Date());

    if (workspaceIds !== null) {
      invitationQuery = invitationQuery.where("workspaceId", "in", workspaceIds);
    }

    const invitationStats = await invitationQuery.executeTakeFirst();

    // Get workspace members count
    let memberQuery = database
      .selectFrom("workspace_member")
      .select((eb) => [eb.fn.count("id").as("total")]);

    if (workspaceIds !== null) {
      memberQuery = memberQuery.where("workspaceId", "in", workspaceIds);
    }

    const memberStats = await memberQuery.executeTakeFirst();

    return json({
      users: {
        total: userTotal,
      },
      workspaces: {
        total: Number(workspaceStats?.total || 0),
      },
      tasks: {
        total: Number(taskStats?.total || 0),
        byStatus: tasksByStatus.reduce((acc, row) => {
          acc[row.status || "unknown"] = Number(row.count);
          return acc;
        }, {} as Record<string, number>),
      },
      invitations: {
        pending: Number(invitationStats?.total || 0),
      },
      members: {
        total: Number(memberStats?.total || 0),
      },
    });
  });
}
