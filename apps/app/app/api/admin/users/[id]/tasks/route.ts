import { database } from "@repo/database";
import {
  json,
  errorResponse,
  requireAdminAuth,
  withErrorHandler,
} from "../../../../_lib/api-utils";
import { assigneeService } from "@/lib/services/assignee";
import { memberService } from "@/lib/services/member";
import { notificationService } from "@repo/notifications";
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
        "task.dueDateValue as dueDate",
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

/**
 * POST /api/admin/users/[id]/tasks - Assign user to a task
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, workspaceIds } = await requireAdminAuth();
    const { id: userId } = await params;

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return errorResponse("taskId is required", 400);
    }

    // Get task's workspace
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

    // Check admin has access to this workspace
    if (workspaceIds !== null && !workspaceIds.includes(task.workspaceId)) {
      return errorResponse("Task not found", 404);
    }

    // Check if user is a member of the workspace
    const isMember = await memberService.isMember(task.workspaceId, userId);
    if (!isMember) {
      return errorResponse(
        "User must be a member of the workspace first",
        400
      );
    }

    // Use assigneeService.assign with notification and audit context
    const result = await assigneeService.assign(
      taskId,
      userId,
      notificationService,
      { actorId: user.id, source: "admin" }
    );

    if (!result.success) {
      if (result.error === "NOT_WORKSPACE_MEMBER") {
        return errorResponse(
          "User must be a workspace member first",
          400
        );
      }
      if (result.error === "ALREADY_ASSIGNED") {
        return errorResponse("User is already assigned to this task", 400);
      }
      return errorResponse(result.error || "Failed to assign user", 400);
    }

    return json({ success: true, assignee: result.assignee }, 201);
  });
}
