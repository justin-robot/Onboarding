import { database, memberService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/activity - Get activity feed for a workspace
 * Query params:
 *   - limit: number of entries (default 50, max 100)
 *   - offset: pagination offset (default 0)
 */
export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("Not a member of this workspace", 403);
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Fetch audit log entries with user and task info via joins
    const entries = await database
      .selectFrom("moxo_audit_log_entry as audit")
      .leftJoin("user", "user.id", "audit.actorId")
      .leftJoin("task", "task.id", "audit.taskId")
      .leftJoin("section", "section.id", "task.sectionId")
      .select([
        "audit.id",
        "audit.eventType",
        "audit.actorId",
        "audit.taskId",
        "audit.metadata",
        "audit.createdAt",
        "user.name as actorName",
        "user.image as actorAvatarUrl",
        "task.title as taskTitle",
        "section.title as sectionTitle",
      ])
      .where("audit.workspaceId", "=", workspaceId)
      .orderBy("audit.createdAt", "desc")
      .limit(limit + 1) // Fetch one extra to check if there are more
      .offset(offset)
      .execute();

    // Check if there are more entries
    const hasMore = entries.length > limit;
    const resultEntries = hasMore ? entries.slice(0, limit) : entries;

    // Transform entries for the client
    const activityEntries = resultEntries.map((entry) => ({
      id: entry.id,
      eventType: entry.eventType,
      actorId: entry.actorId,
      actorName: entry.actorName || undefined,
      actorAvatarUrl: entry.actorAvatarUrl || undefined,
      taskId: entry.taskId || undefined,
      taskTitle: entry.taskTitle || undefined,
      sectionTitle: entry.sectionTitle || undefined,
      metadata: entry.metadata
        ? typeof entry.metadata === "string"
          ? JSON.parse(entry.metadata)
          : entry.metadata
        : undefined,
      createdAt: entry.createdAt,
    }));

    return json({
      entries: activityEntries,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined,
    });
  });
}
