import { database } from "@repo/database";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/tasks/[id]/assignees - Get all assignees for a task
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id: taskId } = await params;

    // Check if task exists and user has access
    const task = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["task.id", "section.workspaceId"])
      .where("task.id", "=", taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Check workspace access
    if (workspaceIds !== null && !workspaceIds.includes(task.workspaceId)) {
      return errorResponse("Task not found", 404);
    }

    // Get assignees with user info
    const assignees = await database
      .selectFrom("task_assignee")
      .innerJoin("user", "user.id", "task_assignee.userId")
      .select([
        "task_assignee.id",
        "task_assignee.userId",
        "task_assignee.status",
        "task_assignee.completedAt",
        "user.name",
        "user.email",
      ])
      .where("task_assignee.taskId", "=", taskId)
      .execute();

    return json({ data: assignees });
  });
}
