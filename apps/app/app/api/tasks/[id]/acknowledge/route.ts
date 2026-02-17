import { taskService, sectionService } from "@/lib/services";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/acknowledge - Acknowledge a task
 *
 * Used for ACKNOWLEDGEMENT type tasks where user confirms they've
 * read/understood something.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Get task to verify type
    const task = await taskService.getById(id);
    if (!task) {
      return errorResponse("Task not found", 404);
    }

    if (task.type !== "ACKNOWLEDGEMENT") {
      return errorResponse("This endpoint is only for acknowledgement tasks", 400);
    }

    if (task.status === "completed") {
      return errorResponse("Task is already completed", 400);
    }

    // Mark the task as completed
    const completedTask = await taskService.markComplete(id);
    if (!completedTask) {
      return errorResponse("Failed to acknowledge task", 500);
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
              completedBy: user.id,
            }
          );
        }
      } catch (err) {
        console.error("Failed to broadcast acknowledgement:", err);
      }
    })();

    return json({
      success: true,
      task: completedTask,
    });
  });
}
