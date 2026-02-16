import { database } from "../index";
import type { MoxoAuditLogEntry } from "../schemas/main";

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
