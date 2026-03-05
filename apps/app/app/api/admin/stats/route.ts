import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";

/**
 * GET /api/admin/stats - Get dashboard statistics
 */
export async function GET() {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    // Get user stats
    const userStats = await database
      .selectFrom("user")
      .select((eb) => [
        eb.fn.count("id").as("total"),
      ])
      .executeTakeFirst();

    // Get workspace stats
    const workspaceStats = await database
      .selectFrom("workspace")
      .select((eb) => [
        eb.fn.count("id").as("total"),
      ])
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    // Get task stats by status
    const taskStats = await database
      .selectFrom("task")
      .select((eb) => [
        eb.fn.count("id").as("total"),
      ])
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const tasksByStatus = await database
      .selectFrom("task")
      .select(["status", (eb) => eb.fn.count("id").as("count")])
      .where("deletedAt", "is", null)
      .groupBy("status")
      .execute();

    // Get pending invitations count
    const invitationStats = await database
      .selectFrom("pending_invitation")
      .select((eb) => [
        eb.fn.count("id").as("total"),
      ])
      .where("expiresAt", ">", new Date())
      .executeTakeFirst();

    // Get workspace members count
    const memberStats = await database
      .selectFrom("workspace_member")
      .select((eb) => [
        eb.fn.count("id").as("total"),
      ])
      .executeTakeFirst();

    return json({
      users: {
        total: Number(userStats?.total || 0),
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
