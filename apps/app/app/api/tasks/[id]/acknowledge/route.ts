import { taskService, configService, sectionService, completionService } from "@/lib/services";
import { database } from "@repo/database";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { auditLogService } from "@/lib/services/auditLog";
import { notificationService } from "@repo/notifications";
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

    // Get acknowledgement config
    const config = await configService.getAcknowledgementConfigByTaskId(id);
    if (!config) {
      return errorResponse("Acknowledgement config not found", 404);
    }

    // Check if user already acknowledged
    const existingAck = await database
      .selectFrom("acknowledgement")
      .selectAll()
      .where("configId", "=", config.id)
      .where("userId", "=", user.id)
      .executeTakeFirst();

    if (existingAck?.status === "acknowledged") {
      return errorResponse("You have already acknowledged this task", 400);
    }

    // Record the acknowledgement
    if (existingAck) {
      await database
        .updateTable("acknowledgement")
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          updatedAt: new Date(),
        })
        .where("id", "=", existingAck.id)
        .execute();
    } else {
      await database
        .insertInto("acknowledgement")
        .values({
          configId: config.id,
          userId: user.id,
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .execute();
    }

    // Get section for workspaceId (needed for audit log and broadcast)
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Use completion service to handle completion rule logic
    const completionResult = await completionService.completeTaskForUser(id, user.id, notificationService);

    // Log audit event - always log as acknowledgement.completed
    // The taskCompleted flag in metadata indicates if the whole task was completed
    await auditLogService.logEvent({
      workspaceId: section.workspaceId,
      eventType: "acknowledgement.completed",
      actorId: user.id,
      taskId: id,
      source: "web",
      metadata: {
        taskTitle: task.title,
        taskType: task.type,
        taskCompleted: completionResult.taskCompleted,
      },
    });

    if (!completionResult.success) {
      // If user wasn't assigned, the acknowledgement was still recorded
      // but they can't "complete" the task
      if (completionResult.error === "USER_NOT_ASSIGNED") {
        return json({
          success: true,
          acknowledged: true,
          taskCompleted: false,
          message: "Acknowledged, but you are not assigned to this task",
        });
      }
      if (completionResult.error === "ALREADY_COMPLETED") {
        return json({
          success: true,
          acknowledged: true,
          taskCompleted: false,
          message: "Already acknowledged",
        });
      }
    }

    // Get updated task
    const updatedTask = await taskService.getById(id);

    // Broadcast task update via Ably (non-blocking)
    (async () => {
      try {
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
            acknowledgedBy: user.id,
            taskCompleted: completionResult.taskCompleted,
          }
        );
      } catch (err) {
        console.error("Failed to broadcast acknowledgement:", err);
      }
    })();

    return json({
      success: true,
      acknowledged: true,
      taskCompleted: completionResult.taskCompleted || false,
      task: updatedTask,
    });
  });
}
