import { assigneeService, memberService, taskService, sectionService } from "@/lib/services";
import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/assignees - Get all assignees for a task with user info
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    await requireAuth();
    const { id: taskId } = await params;

    // Get assignees with user info
    const assignees = await database
      .selectFrom("task_assignee")
      .innerJoin("user", "user.id", "task_assignee.userId")
      .select([
        "task_assignee.id",
        "task_assignee.taskId",
        "task_assignee.userId",
        "task_assignee.status",
        "task_assignee.completedAt",
        "task_assignee.createdAt",
        "user.name as userName",
        "user.email as userEmail",
      ])
      .where("task_assignee.taskId", "=", taskId)
      .execute();

    return json({ assignees });
  });
}

/**
 * POST /api/tasks/[id]/assignees - Assign a user to a task
 *
 * Body: { userId: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return errorResponse("userId is required", 400);
    }

    // Get task to find workspace
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get section to find workspace
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Check if current user is admin
    const currentMember = await memberService.getMember(section.workspaceId, user.id);
    if (!currentMember || currentMember.role !== "admin") {
      return errorResponse("Only admins can assign users to tasks", 403);
    }

    // Assign the user with audit context
    const result = await assigneeService.assign(
      taskId,
      userId,
      undefined, // notificationContext
      {
        actorId: user.id,
        source: "web",
      }
    );

    if (!result.success) {
      if (result.error === "ALREADY_ASSIGNED") {
        return errorResponse("User is already assigned to this task", 400);
      }
      return errorResponse(result.error || "Failed to assign user", 400);
    }

    return json({ assignee: result.assignee }, 201);
  });
}
