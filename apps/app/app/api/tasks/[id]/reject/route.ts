import { taskService, configService, sectionService, assigneeService, workspaceService } from "@/lib/services";
import { ablyService, WORKSPACE_EVENTS } from "@/lib/services/ably";
import { auditLogService } from "@/lib/services/auditLog";
import { notificationService } from "@repo/notifications";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tasks/[id]/reject - Reject a task
 *
 * Used for APPROVAL type tasks where user rejects submitted content.
 * Body: { reason: string }
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

    // Parse body for rejection reason
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON
    }

    if (!reason) {
      return errorResponse("Rejection reason is required", 400);
    }

    // Record the rejection decision
    const result = await configService.recordApprovalDecision(id, user.id, {
      approved: false,
      comments: reason,
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to record rejection", 500);
    }

    // Get section for workspaceId (needed for audit log)
    const section = await sectionService.getById(task.sectionId);
    if (!section) {
      return errorResponse("Section not found", 404);
    }

    // Log audit event for rejection
    await auditLogService.logEvent({
      workspaceId: section.workspaceId,
      eventType: "approval.rejected",
      actorId: user.id,
      taskId: id,
      source: "web",
      metadata: {
        taskTitle: task.title,
        reason,
      },
    });

    // For rejection, we keep the task open (not completed) so the submitter can revise
    // Just update the task to reflect it needs revision
    const updatedTask = await taskService.getById(id);

    // Get workspace info and notify assignees of rejection (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(task.sectionId);
        if (!section) return;

        const workspace = await workspaceService.getById(section.workspaceId);
        if (!workspace) return;

        // Get all assignees (excluding the rejector)
        const assignees = await assigneeService.getByTaskId(id);
        const otherAssignees = assignees.filter((a) => a.userId !== user.id);

        // Send approval-rejected notification to each assignee
        for (const assignee of otherAssignees) {
          await notificationService.triggerWorkflow({
            workflowId: "approval-rejected",
            recipientId: assignee.userId,
            actorId: user.id,
            data: {
              workspaceId: section.workspaceId,
              workspaceName: workspace.name,
              taskId: task.id,
              taskTitle: task.title,
              rejectedBy: user.name || user.email,
              rejectionReason: reason,
            },
            tenant: section.workspaceId,
          });
        }
      } catch (err) {
        console.error("Failed to send rejection notifications:", err);
      }
    })();

    // Broadcast rejection via Ably (non-blocking)
    (async () => {
      try {
        const section = await sectionService.getById(task.sectionId);
        if (section) {
          await ablyService.broadcastToWorkspace(
            section.workspaceId,
            WORKSPACE_EVENTS.TASK_UPDATED,
            {
              id: task.id,
              title: task.title,
              type: task.type,
              status: task.status,
              sectionId: task.sectionId,
              rejected: true,
              rejectedBy: user.id,
              rejectionReason: reason,
            }
          );
        }
      } catch (err) {
        console.error("Failed to broadcast rejection:", err);
      }
    })();

    return json({
      success: true,
      rejected: true,
      reason,
      task: updatedTask,
    });
  });
}
