import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]/workspaces - Get user's workspace details with task progress
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id: userId } = await params;

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [] });
    }

    // Get all workspaces the user is a member of with task stats (scoped)
    let query = database
      .selectFrom("workspace_member")
      .innerJoin("workspace", "workspace.id", "workspace_member.workspaceId")
      .select([
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .select((eb) => [
        // Total tasks assigned to user in this workspace
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .where("task_assignee.userId", "=", userId)
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("totalTasks"),
        // Completed tasks
        eb
          .selectFrom("task_assignee")
          .innerJoin("task", "task.id", "task_assignee.taskId")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task_assignee.id").as("count"))
          .where("task_assignee.userId", "=", userId)
          .where("task_assignee.status", "=", "completed")
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("completedTasks"),
      ])
      .where("workspace_member.userId", "=", userId)
      .where("workspace.deletedAt", "is", null);

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("workspace.id", "in", workspaceIds);
    }

    const workspaces = await query
      .orderBy("workspace.name", "asc")
      .execute();

    // Format the response
    const workspacesWithProgress = workspaces.map((w) => ({
      workspaceId: w.workspaceId,
      workspaceName: w.workspaceName,
      totalTasks: Number(w.totalTasks || 0),
      completedTasks: Number(w.completedTasks || 0),
    }));

    return json({ data: workspacesWithProgress });
  });
}
