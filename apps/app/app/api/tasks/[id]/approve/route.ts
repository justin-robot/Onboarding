import { taskService, configService, sectionService } from "@/lib/services";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/approve - Approve a task
 *
 * Used for APPROVAL type tasks where user approves submitted content.
 * Body (optional): { comments?: string }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Get task to verify type
    const task = await taskService.getById(id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    if (task.type !== "APPROVAL") {
      return errorResponse("This endpoint is only for approval tasks", 400);
    }

    if (task.status === "completed") {
      return errorResponse("Task is already completed", 400);
    }

    // Parse optional body for comments
    let comments: string | undefined;
    try {
      const text = await request.text();
      if (text) {
        const body = JSON.parse(text);
        comments = body.comments;
      }
    } catch {
      // No body - that's ok
    }

    // Record the approval decision
    const result = await configService.recordApprovalDecision(id, user.id, {
      approved: true,
      comments,
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to record approval", 500);
    }

    // Mark the task as completed
    const completedTask = await taskService.markComplete(id);
    if (!completedTask) {
      return errorResponse("Failed to complete task", 500);
    }

    // Broadcast task completion via Ably (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(task.sectionId);
        if (section) {
          await ablyService.broadcastToWorkspace(
            section.workspaceId,
            WORKSPACE_EVENTS.TASK_COMPLETED,
            {
              id: completedTask.id,
              title: completedTask.title,
              type: completedTask.type,
              status: completedTask.status,
              sectionId: completedTask.sectionId,
              approved: true,
              approvedBy: user.id,
            }
          );
        }
      } catch (err) {
        console.error("Failed to broadcast approval:", err);
      }
    })();

    return json({
      success: true,
      approved: true,
      task: completedTask,
    });
  });
}
