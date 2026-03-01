import { auditLogService } from "@/lib/services/auditLog";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { database } from "@repo/database";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/tasks/[id]/activity - Get activity logs for a task
 * Returns audit log entries formatted for display
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: taskId } = await params;

    // Get audit logs for this task
    const logs = await auditLogService.getByTaskId(taskId, { limit: 50 });

    // Get unique actor IDs to fetch names
    const actorIds = [...new Set(logs.map((l) => l.actorId))];

    // Fetch user names
    const users = actorIds.length > 0
      ? await database
          .selectFrom("user")
          .select(["id", "name", "email"])
          .where("id", "in", actorIds)
          .execute()
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Format logs for display
    const activities = logs.map((log) => {
      const actor = userMap.get(log.actorId);
      const actorName = actor?.name || actor?.email || "Someone";
      const isCurrentUser = log.actorId === user.id;
      const metadata = log.metadata as Record<string, unknown> | null;

      return {
        id: log.id,
        type: "activity" as const,
        eventType: log.eventType,
        actorId: log.actorId,
        actorName: isCurrentUser ? "You" : actorName,
        isCurrentUser,
        message: formatActivityMessage(log.eventType, actorName, isCurrentUser, metadata),
        createdAt: log.createdAt,
        metadata,
      };
    });

    return json({ activities });
  });
}

/**
 * Format activity message based on event type
 */
function formatActivityMessage(
  eventType: string,
  actorName: string,
  isCurrentUser: boolean,
  metadata: Record<string, unknown> | null
): string {
  const subject = isCurrentUser ? "You" : actorName;
  // Support both 'taskType' and 'type' for flexibility with different event sources
  const taskType = (metadata?.taskType as string) || (metadata?.type as string) || "Task";
  const taskTitle = (metadata?.taskTitle as string) || (metadata?.title as string);
  // Support both 'targetName' and 'assigneeName' for assignment events
  const targetName = (metadata?.targetName as string) || (metadata?.assigneeName as string);

  switch (eventType) {
    // Task events
    case "task.created":
      return `${subject} added this ${formatTaskType(taskType)}.`;
    case "task.completed":
      return `${formatTaskType(taskType)} completed.`;
    case "task.reopened":
      return `${subject} reopened this ${formatTaskType(taskType)}.`;
    case "task.assigned":
      if (targetName) {
        return `${formatTaskType(taskType)} assigned to ${targetName}.`;
      }
      return `${subject} ${isCurrentUser ? "were" : "was"} assigned to this ${formatTaskType(taskType)}.`;
    case "task.unassigned":
      if (targetName) {
        return `${targetName} ${isCurrentUser ? "were" : "was"} removed from this ${formatTaskType(taskType)}.`;
      }
      return `${subject} ${isCurrentUser ? "were" : "was"} unassigned from this ${formatTaskType(taskType)}.`;

    // Form events
    case "form.submitted":
      return `${subject} submitted the form.`;
    case "form.draft_saved":
      return `${subject} saved a draft.`;

    // File events
    case "file.uploaded":
      const fileCount = (metadata?.fileCount as number) || 1;
      return `${subject} submitted ${fileCount} file${fileCount > 1 ? "s" : ""}.`;
    case "file.deleted":
      return `${subject} deleted a file.`;

    // Approval events
    case "approval.approved":
      return `${subject} approved this ${formatTaskType(taskType)}.`;
    case "approval.rejected":
      return `${subject} rejected this ${formatTaskType(taskType)}.`;
    case "approval.requested":
      return `${formatTaskType(taskType)} ready for review.`;

    // Acknowledgement events
    case "acknowledgement.completed":
    case "task.acknowledged":
      return `${subject} acknowledged this ${formatTaskType(taskType)}.`;

    // Individual assignee completion
    case "task.assignee_completed": {
      const userName = metadata?.userName as string;
      if (userName) {
        return `${isCurrentUser ? "You" : userName} completed their part.`;
      }
      return `${subject} completed their part.`;
    }

    // Booking events
    case "booking.scheduled":
    case "meeting.booked":
      return `${subject} scheduled a booking.`;
    case "booking.cancelled":
      return `${subject} cancelled the booking.`;

    // E-Sign events
    case "esign.sent":
      return `Document sent for signature.`;
    case "esign.viewed":
      return `${subject} viewed the document.`;
    case "esign.signed":
      return `${subject} signed the document.`;
    case "esign.completed":
      return `E-signature completed.`;
    case "esign.declined":
      return `${subject} declined to sign.`;

    // Comment events
    case "comment.created":
    case "comment.added":
      return `${subject} added a comment.`;
    case "comment.deleted":
      return `${subject} deleted a comment.`;

    // Default
    default:
      return `${subject} performed an action.`;
  }
}

/**
 * Format task type for display
 */
function formatTaskType(type: string): string {
  const typeMap: Record<string, string> = {
    FORM: "Form",
    form: "Form",
    ACKNOWLEDGEMENT: "Acknowledgement",
    acknowledgement: "Acknowledgement",
    FILE_REQUEST: "File Request",
    file_upload: "File Request",
    APPROVAL: "Approval",
    approval: "Approval",
    TIME_BOOKING: "Booking",
    booking: "Booking",
    E_SIGN: "E-Sign",
    esign: "E-Sign",
  };
  return typeMap[type] || "Task";
}
