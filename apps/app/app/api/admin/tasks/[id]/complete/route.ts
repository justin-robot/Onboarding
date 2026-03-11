import { completionService, auditLogService } from "@/lib/services";
import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const completeTaskSchema = z.object({
  userId: z.string().optional(),
  bypassDependencies: z.boolean().optional().default(false),
});

/**
 * POST /api/admin/tasks/[id]/complete - Complete a task on behalf of a user
 *
 * Body:
 * - userId?: string - The user to complete the task for. If not provided, completes via system.
 * - bypassDependencies?: boolean - If true, allows completing locked tasks (default: false)
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const admin = await requireAuth();

    if (admin.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { id: taskId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = completeTaskSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid request body", 400);
    }

    const { userId, bypassDependencies } = parsed.data;

    // Get the task with workspace info
    const task = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select([
        "task.id",
        "task.title",
        "task.type",
        "task.status",
        "section.workspaceId",
      ])
      .where("task.id", "=", taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!task) {
      return errorResponse("Task not found", 404);
    }

    if (task.status === "completed") {
      return errorResponse("Task is already completed", 400);
    }

    // If bypassing dependencies, use system completion
    // Otherwise, if userId is provided, complete for that specific user
    if (bypassDependencies || !userId) {
      // System completion - marks all assignees as complete
      const result = await completionService.completeTaskSystem(taskId);

      if (!result.success) {
        return errorResponse(result.error || "Failed to complete task", 400);
      }

      // Log admin action
      await auditLogService.logEvent({
        workspaceId: task.workspaceId,
        eventType: "task.completed",
        actorId: admin.id,
        taskId,
        source: "admin",
        metadata: {
          taskTitle: task.title,
          taskType: task.type,
          completedVia: "admin_system",
          bypassDependencies,
        },
      });

      return json({
        success: true,
        taskCompleted: true,
        message: "Task completed via admin system completion",
      });
    } else {
      // Complete for specific user
      const result = await completionService.completeTaskForUser(taskId, userId);

      if (!result.success) {
        const errorMessages: Record<string, string> = {
          USER_NOT_ASSIGNED: "User is not assigned to this task",
          TASK_LOCKED: "Task is locked (dependencies not satisfied). Use bypassDependencies to override.",
          ALREADY_COMPLETED: "User has already completed this task",
          TASK_ALREADY_COMPLETED: "Task is already completed",
        };
        return errorResponse(errorMessages[result.error || ""] || "Failed to complete task", 400);
      }

      // Log admin action
      await auditLogService.logEvent({
        workspaceId: task.workspaceId,
        eventType: "task.completed",
        actorId: admin.id,
        taskId,
        source: "admin",
        metadata: {
          taskTitle: task.title,
          taskType: task.type,
          completedVia: "admin_on_behalf",
          onBehalfOfUserId: userId,
          taskFullyCompleted: result.taskCompleted,
        },
      });

      return json({
        success: true,
        taskCompleted: result.taskCompleted,
        message: result.taskCompleted
          ? "Task completed"
          : "User marked as completed, but task completion rule not yet satisfied",
      });
    }
  });
}
