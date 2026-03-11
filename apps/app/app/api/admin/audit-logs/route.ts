import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/audit-logs - List audit log entries (scoped by admin access)
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const eventType = searchParams.get("eventType") || "";
    const workspaceId = searchParams.get("workspaceId") || "";
    const actorId = searchParams.get("actorId") || "";
    const source = searchParams.get("source") || "";

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [], total: 0, filters: { eventTypes: [] } });
    }

    // Build base query with joins
    let query = database
      .selectFrom("moxo_audit_log_entry")
      .leftJoin("user as actor", "actor.id", "moxo_audit_log_entry.actorId")
      .leftJoin("workspace", "workspace.id", "moxo_audit_log_entry.workspaceId")
      .leftJoin("task", "task.id", "moxo_audit_log_entry.taskId")
      .select([
        "moxo_audit_log_entry.id",
        "moxo_audit_log_entry.eventType",
        "moxo_audit_log_entry.metadata",
        "moxo_audit_log_entry.source",
        "moxo_audit_log_entry.ipAddress",
        "moxo_audit_log_entry.createdAt",
        "actor.id as actorId",
        "actor.name as actorName",
        "actor.email as actorEmail",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
        "task.id as taskId",
        "task.title as taskTitle",
      ]);

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("moxo_audit_log_entry.workspaceId", "in", workspaceIds);
    }

    // Event type filter
    if (eventType) {
      query = query.where("moxo_audit_log_entry.eventType", "=", eventType);
    }

    // Workspace filter (additional filter on top of scope)
    if (workspaceId) {
      query = query.where("moxo_audit_log_entry.workspaceId", "=", workspaceId);
    }

    // Actor filter
    if (actorId) {
      query = query.where("moxo_audit_log_entry.actorId", "=", actorId);
    }

    // Source filter
    if (source) {
      query = query.where("moxo_audit_log_entry.source", "=", source);
    }

    // Get total count (with same scoping)
    let countQuery = database
      .selectFrom("moxo_audit_log_entry")
      .select((eb) => eb.fn.count("id").as("total"));

    // Apply workspace scope to count query
    if (workspaceIds !== null) {
      countQuery = countQuery.where("workspaceId", "in", workspaceIds);
    }

    if (eventType) {
      countQuery = countQuery.where("eventType", "=", eventType);
    }
    if (workspaceId) {
      countQuery = countQuery.where("workspaceId", "=", workspaceId);
    }
    if (actorId) {
      countQuery = countQuery.where("actorId", "=", actorId);
    }
    if (source) {
      countQuery = countQuery.where("source", "=", source);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply sorting (always by createdAt for audit logs)
    query = query.orderBy(
      "moxo_audit_log_entry.createdAt",
      sortDirection === "asc" ? "asc" : "desc"
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const logs = await query.execute();

    // Get distinct event types for filtering (scoped)
    let eventTypesQuery = database
      .selectFrom("moxo_audit_log_entry")
      .select("eventType")
      .distinct()
      .orderBy("eventType", "asc");

    if (workspaceIds !== null) {
      eventTypesQuery = eventTypesQuery.where("workspaceId", "in", workspaceIds);
    }

    const eventTypes = await eventTypesQuery.execute();

    return json({
      data: logs,
      total,
      filters: {
        eventTypes: eventTypes.map((e) => e.eventType),
      },
    });
  });
}
