import { taskService, configService, sectionService } from "@repo/database";
import { ablyService, WORKSPACE_EVENTS } from "@repo/database/services/ably";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/complete - Mark task as completed
 *
 * Handles type-specific completion data:
 * - APPROVAL: { approved: boolean, reason?: string }
 * - TIME_BOOKING: { date: string, time: string }
 * - Others: no additional data required
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Get task to determine type
    const existingTask = await taskService.getById(id);
    if (!existingTask) {
      return errorResponse("Task not found", 404);
    }

    // Parse request body for type-specific data
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // No body or invalid JSON - that's ok for most task types
    }

    // Handle type-specific completion logic
    switch (existingTask.type) {
      case "APPROVAL": {
        const approved = body.approved as boolean;
        const reason = body.reason as string | undefined;

        if (typeof approved !== "boolean") {
          return errorResponse("approved field is required for approval tasks", 400);
        }

        const result = await configService.recordApprovalDecision(id, user.id, {
          approved,
          comments: reason,
        });

        if (!result.success) {
          return errorResponse(result.error || "Failed to record approval", 500);
        }
        break;
      }

      case "TIME_BOOKING": {
        const dateStr = body.date as string;
        const time = body.time as string;

        if (!dateStr || !time) {
          return errorResponse("date and time fields are required for booking tasks", 400);
        }

        // Parse the date and combine with time
        const bookedAt = new Date(dateStr);

        const result = await configService.recordBooking(id, user.id, {
          bookedAt,
          // calendarEventId and meetLink can be added later via calendar integration
        });

        if (!result.success) {
          return errorResponse(result.error || "Failed to record booking", 500);
        }
        break;
      }

      // For other types (FORM, ACKNOWLEDGEMENT, FILE_REQUEST, E_SIGN),
      // no additional data is needed - just mark complete
    }

    // Mark the task as completed
    const task = await taskService.markComplete(id);
    if (!task) {
      return errorResponse("Failed to complete task", 500);
    }

    // Broadcast task completion via Ably (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(existingTask.sectionId);
        if (section) {
          await ablyService.broadcastToWorkspace(
            section.workspaceId,
            WORKSPACE_EVENTS.TASK_COMPLETED,
            {
              id: task.id,
              title: task.title,
              type: task.type,
              status: task.status,
              sectionId: task.sectionId,
            }
          );
        }
      } catch (err) {
        console.error("Failed to broadcast task completion:", err);
      }
    })();

    return json(task);
  });
}
