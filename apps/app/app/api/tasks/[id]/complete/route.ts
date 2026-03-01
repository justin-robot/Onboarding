import { taskService, configService, sectionService, completionService } from "@/lib/services";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { auditLogService } from "@/lib/services/auditLog";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/complete - Mark task as completed
 *
 * Handles type-specific completion data:
 * - APPROVAL: { approved: boolean, reason?: string }
 * - TIME_BOOKING: { date?: string, time?: string } (optional - V1 is simple confirmation)
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
        // V1: date/time are optional - user just confirms they booked externally
        const dateStr = body.date as string | undefined;
        const time = body.time as string | undefined;

        // Parse bookedAt if date provided, otherwise use current time as confirmation timestamp
        const bookedAt = dateStr ? new Date(dateStr) : new Date();

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

    // Get section for workspaceId (needed for audit log and broadcast)
    const section = await sectionService.getById(existingTask.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Complete the task for this user (handles assignee status and completion rules)
    const completionResult = await completionService.completeTaskForUser(id, user.id);

    if (!completionResult.success) {
      // ALREADY_COMPLETED is not an error - user may have already completed
      if (completionResult.error === "ALREADY_COMPLETED") {
        const task = await taskService.getById(id);
        return json(task);
      }
      return errorResponse(completionResult.error || "Failed to complete task", 500);
    }

    // Get the updated task to return
    const task = await taskService.getById(id);
    if (!task) {
      return errorResponse("Task not found after completion", 500);
    }

    // Log audit event
    await auditLogService.logEvent({
      workspaceId: section.workspaceId,
      eventType: "task.completed",
      actorId: user.id,
      taskId: id,
      source: "web",
      metadata: {
        taskTitle: task.title,
        taskType: task.type,
      },
    });

    // Broadcast task completion via Ably (non-blocking)
    (async () => {
      try {
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
      } catch (err) {
        console.error("Failed to broadcast task completion:", err);
      }
    })();

    return json(task);
  });
}
