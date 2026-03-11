import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]/tasks - Get all tasks assigned to a user
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id: userId } = await params;

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [] });
    }

    // Get all tasks assigned to the user (scoped by workspace)
    let query = database
      .selectFrom("task_assignee")
      .innerJoin("task", "task.id", "task_assignee.taskId")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id as taskId",
        "task.title",
        "task.type",
        "task.status as taskStatus",
        "task.dueDate",
        "task.completedAt as taskCompletedAt",
        "task_assignee.status as assigneeStatus",
        "task_assignee.completedAt as assigneeCompletedAt",
        "section.title as sectionTitle",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("task_assignee.userId", "=", userId)
      .where("task.deletedAt", "is", null)
      .where("workspace.deletedAt", "is", null);

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("workspace.id", "in", workspaceIds);
    }

    const tasks = await query
      .orderBy("workspace.name", "asc")
      .orderBy("section.title", "asc")
      .orderBy("task.position", "asc")
      .execute();

    // Format the response
    const formattedTasks = tasks.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      type: t.type,
      taskStatus: t.taskStatus,
      assigneeStatus: t.assigneeStatus,
      dueDate: t.dueDate,
      taskCompletedAt: t.taskCompletedAt,
      assigneeCompletedAt: t.assigneeCompletedAt,
      sectionTitle: t.sectionTitle,
      workspaceId: t.workspaceId,
      workspaceName: t.workspaceName,
    }));

    return json({ data: formattedTasks });
  });
}
