import { taskService, configService, sectionService, completionService } from "@/lib/services";
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

    // Use completion service to handle completion rule logic
    const completionResult = await completionService.completeTaskForUser(id, user.id);

    if (!completionResult.success) {
      // If user wasn't assigned, the approval was still recorded
      if (completionResult.error === "USER_NOT_ASSIGNED") {
        return json({
          success: true,
          approved: true,
          taskCompleted: false,
          message: "Approval recorded, but you are not assigned to this task",
        });
      }
      if (completionResult.error === "ALREADY_COMPLETED") {
        return json({
          success: true,
          approved: true,
          taskCompleted: false,
          message: "Already approved",
        });
      }
    }

    // Get updated task
    const updatedTask = await taskService.getById(id);

    // Broadcast task update via Ably (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(task.sectionId);
        if (section) {
          const eventType = completionResult.taskCompleted
            ? WORKSPACE_EVENTS.TASK_COMPLETED
            : WORKSPACE_EVENTS.TASK_UPDATED;

          await ablyService.broadcastToWorkspace(
            section.workspaceId,
            eventType,
            {
              id: task.id,
              title: task.title,
              type: task.type,
              status: updatedTask?.status || task.status,
              sectionId: task.sectionId,
              approved: true,
              approvedBy: user.id,
              taskCompleted: completionResult.taskCompleted,
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
      taskCompleted: completionResult.taskCompleted || false,
      task: updatedTask,
    });
  });
}
