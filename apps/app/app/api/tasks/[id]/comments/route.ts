import { commentService, taskService, memberService } from "@/lib/services";
import { notificationService } from "@repo/notifications";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import type { NotificationContext } from "@/lib/services";

// Create notification context wrapper for the comment service
const notificationContext: NotificationContext = {
  triggerWorkflow: async (options) => {
    return notificationService.triggerWorkflow({
      workflowId: options.workflowId,
      recipientId: options.recipientId,
      data: options.data as Parameters<typeof notificationService.triggerWorkflow>[0]["data"],
      tenant: options.tenant,
    });
  },
};

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/comments - Get all comments for a task
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    // Verify task exists
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get workspace ID from task's section
    const workspaceId = await commentService.getTaskWorkspaceId(taskId);
    if (!workspaceId) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Get comments with user info
    const comments = await commentService.getByTaskId(taskId);

    return json({ comments });
  });
}

/**
 * POST /api/tasks/[id]/comments - Create a comment on a task
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;
    const body = await request.json();

    // Validate content
    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
      return errorResponse("Comment content is required", 400);
    }

    // Verify task exists
    const task = await taskService.getById(taskId);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    // Get workspace ID from task's section
    const workspaceId = await commentService.getTaskWorkspaceId(taskId);
    if (!workspaceId) {
      return errorResponse("Workspace not found", 404);
    }

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this workspace", 403);
    }

    // Create the comment (with notification to other assignees)
    const comment = await commentService.create({
      taskId,
      userId: user.id,
      content: body.content.trim(),
      notificationContext,
    });

    // Return comment with user info
    return json({
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      userName: user.name,
      userImage: user.image,
      content: comment.content,
      createdAt: comment.createdAt,
    }, 201);
  });
}
