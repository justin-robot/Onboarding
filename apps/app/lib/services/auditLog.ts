import { database } from "@repo/database";
import type { MoxoAuditLogEntry } from "@repo/database";
import { chatService } from "./chat";

// Event type taxonomy
export type AuditEventType =
  // Task events
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.reopened"
  | "task.deleted"
  | "task.assigned"
  | "task.unassigned"
  // Form events
  | "form.submitted"
  | "form.draft_saved"
  // File events
  | "file.uploaded"
  | "file.deleted"
  | "file.downloaded"
  // Approval events
  | "approval.approved"
  | "approval.rejected"
  | "approval.requested"
  // Acknowledgement events
  | "acknowledgement.completed"
  // Booking events
  | "booking.scheduled"
  | "booking.cancelled"
  // E-Sign events
  | "esign.sent"
  | "esign.viewed"
  | "esign.signed"
  | "esign.completed"
  | "esign.declined"
  | "esign.cancelled"
  // Workspace events
  | "workspace.created"
  | "workspace.updated"
  | "workspace.deleted"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "workspace.member_role_changed"
  | "workspace.invitation_sent"
  | "workspace.invitation_accepted"
  | "workspace.settings_updated"
  // Section events
  | "section.created"
  | "section.updated"
  | "section.deleted"
  | "section.reordered"
  // Comment events
  | "comment.created"
  | "comment.deleted"
  // Dependency events
  | "dependency.created"
  | "dependency.removed";

// Source of the event
export type AuditSource =
  | "web"        // User action via web UI
  | "api"        // Direct API call
  | "system"     // System-generated event
  | "signnow"    // SignNow webhook
  | "calendly"   // Calendly webhook
  | "resend";    // Resend webhook (email events)

// Input for logging an event
export interface LogEventInput {
  workspaceId: string;
  eventType: AuditEventType;
  actorId: string;
  taskId?: string;
  source: AuditSource;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

// Query options
export interface AuditQueryOptions {
  limit?: number;
  offset?: number;
}

// Audit context for service operations
export interface AuditContext {
  actorId: string;
  source: AuditSource;
  ipAddress?: string;
}

// Events that should generate system messages in chat
const CHAT_SYSTEM_MESSAGE_EVENTS: Set<AuditEventType> = new Set([
  "task.completed",
  "task.reopened",
  "form.submitted",
  "file.uploaded",
  "approval.approved",
  "approval.rejected",
  "acknowledgement.completed",
  "booking.scheduled",
  "esign.signed",
  "esign.completed",
  "workspace.member_added",
  "workspace.member_removed",
  "comment.created",
]);

/**
 * Generate a human-readable message for system chat messages
 */
function generateSystemMessage(
  eventType: AuditEventType,
  actorName: string,
  metadata?: Record<string, unknown>
): string | null {
  const taskTitle = metadata?.taskTitle as string | undefined;
  const taskSuffix = taskTitle ? ` "${taskTitle}"` : "";

  switch (eventType) {
    case "task.completed":
      return `${actorName} completed${taskSuffix}`;
    case "task.reopened":
      return `${actorName} reopened${taskSuffix}`;
    case "form.submitted":
      return `${actorName} submitted a form${taskSuffix}`;
    case "file.uploaded":
      const fileName = metadata?.fileName as string | undefined;
      return `${actorName} uploaded ${fileName || "a file"}${taskSuffix}`;
    case "approval.approved":
      return `${actorName} approved${taskSuffix}`;
    case "approval.rejected":
      return `${actorName} rejected${taskSuffix}`;
    case "acknowledgement.completed":
      return `${actorName} acknowledged${taskSuffix}`;
    case "booking.scheduled":
      return `${actorName} scheduled a meeting${taskSuffix}`;
    case "esign.signed":
      return `${actorName} signed a document${taskSuffix}`;
    case "esign.completed":
      return `Document signing completed${taskSuffix}`;
    case "workspace.member_added":
      const addedMember = metadata?.memberName as string | undefined;
      return `${actorName} added ${addedMember || "a member"} to the workspace`;
    case "workspace.member_removed":
      const removedMember = metadata?.memberName as string | undefined;
      return `${actorName} removed ${removedMember || "a member"} from the workspace`;
    case "comment.created":
      return `${actorName} commented${taskSuffix}`;
    default:
      return null;
  }
}

// Helper to parse JSON metadata from database
function parseMetadata(entry: MoxoAuditLogEntry): MoxoAuditLogEntry {
  return {
    ...entry,
    metadata: entry.metadata
      ? typeof entry.metadata === "string"
        ? JSON.parse(entry.metadata)
        : entry.metadata
      : null,
  };
}

export const auditLogService = {
  /**
   * Log an audit event
   * Also creates a system message in chat for relevant events
   */
  async logEvent(input: LogEventInput): Promise<MoxoAuditLogEntry> {
    const { workspaceId, eventType, actorId, taskId, source, metadata, ipAddress } = input;

    const result = await database
      .insertInto("moxo_audit_log_entry")
      .values({
        workspaceId,
        eventType,
        actorId,
        taskId: taskId ?? null,
        source,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: ipAddress ?? null,
      } as never)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create system message in chat for relevant events
    if (CHAT_SYSTEM_MESSAGE_EVENTS.has(eventType as AuditEventType)) {
      try {
        // Get actor name
        const actor = await database
          .selectFrom("user")
          .select("name")
          .where("id", "=", actorId)
          .executeTakeFirst();

        const actorName = actor?.name || "Someone";
        const messageContent = generateSystemMessage(
          eventType as AuditEventType,
          actorName,
          metadata
        );

        if (messageContent) {
          // Fire and forget - don't block the audit log
          // Pass actorId so chat can show "You" for the current user's actions
          chatService.sendSystemMessage(workspaceId, messageContent, taskId, actorId).catch((err) => {
            console.error("Failed to create system message:", err);
          });
        }
      } catch (err) {
        console.error("Failed to create system message for audit event:", err);
        // Don't fail the audit log if system message fails
      }
    }

    return parseMetadata(result);
  },

  /**
   * Get audit entries for a workspace, ordered by createdAt desc
   */
  async getByWorkspaceId(
    workspaceId: string,
    options: AuditQueryOptions = {}
  ): Promise<MoxoAuditLogEntry[]> {
    let query = database
      .selectFrom("moxo_audit_log_entry")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query.execute();
    return results.map(parseMetadata);
  },

  /**
   * Get audit entries for a specific task
   */
  async getByTaskId(
    taskId: string,
    options: AuditQueryOptions = {}
  ): Promise<MoxoAuditLogEntry[]> {
    let query = database
      .selectFrom("moxo_audit_log_entry")
      .selectAll()
      .where("taskId", "=", taskId)
      .orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query.execute();
    return results.map(parseMetadata);
  },

  /**
   * Get audit entries by actor
   */
  async getByActorId(
    actorId: string,
    options: AuditQueryOptions = {}
  ): Promise<MoxoAuditLogEntry[]> {
    let query = database
      .selectFrom("moxo_audit_log_entry")
      .selectAll()
      .where("actorId", "=", actorId)
      .orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query.execute();
    return results.map(parseMetadata);
  },

  /**
   * Get audit entries by event type within a workspace
   */
  async getByEventType(
    workspaceId: string,
    eventType: AuditEventType,
    options: AuditQueryOptions = {}
  ): Promise<MoxoAuditLogEntry[]> {
    let query = database
      .selectFrom("moxo_audit_log_entry")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("eventType", "=", eventType)
      .orderBy("createdAt", "desc");

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    const results = await query.execute();
    return results.map(parseMetadata);
  },
};
