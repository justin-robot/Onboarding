import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/tasks/[id]/assignees - Get all assignees for a task
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id: taskId } = await params;

    // Check if task exists
    const task = await database
      .selectFrom("task")
      .select("id")
      .where("id", "=", taskId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!task) {
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
