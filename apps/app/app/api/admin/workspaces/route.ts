import { database } from "@repo/database";
import { sql } from "kysely";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/workspaces - List all workspaces with pagination
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const search = searchParams.get("search") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Build base query
    let query = database
      .selectFrom("workspace")
      .select([
        "workspace.id",
        "workspace.name",
        "workspace.description",
        "workspace.dueDate",
        "workspace.createdAt",
        "workspace.updatedAt",
        "workspace.deletedAt",
      ])
      .select((eb) => [
        eb
          .selectFrom("workspace_member")
          .select((eb2) => eb2.fn.count("id").as("count"))
          .whereRef("workspace_member.workspaceId", "=", "workspace.id")
          .as("memberCount"),
        eb
          .selectFrom("task")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task.id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .as("taskCount"),
        eb
          .selectFrom("task")
          .innerJoin("section", "section.id", "task.sectionId")
          .select((eb2) => eb2.fn.count("task.id").as("count"))
          .whereRef("section.workspaceId", "=", "workspace.id")
          .where("task.deletedAt", "is", null)
          .where("task.status", "=", "completed")
          .as("completedTaskCount"),
        eb
          .selectFrom("moxo_audit_log_entry")
          .select(sql<Date>`MAX("moxo_audit_log_entry"."createdAt")`.as("lastActivity"))
          .whereRef("moxo_audit_log_entry.workspaceId", "=", "workspace.id")
          .as("lastActivityAt"),
      ]);

    // Filter by deleted status
    if (!includeDeleted) {
      query = query.where("workspace.deletedAt", "is", null);
    }

    // Search filter
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb("workspace.name", "ilike", `%${search}%`),
          eb("workspace.description", "ilike", `%${search}%`),
        ])
      );
    }

    // Get total count
    const countQuery = database
      .selectFrom("workspace")
      .select((eb) => eb.fn.count("id").as("total"));

    let countQueryWithFilters = includeDeleted
      ? countQuery
      : countQuery.where("deletedAt", "is", null);

    if (search) {
      countQueryWithFilters = countQueryWithFilters.where((eb) =>
        eb.or([
          eb("name", "ilike", `%${search}%`),
          eb("description", "ilike", `%${search}%`),
        ])
      );
    }

    const totalResult = await countQueryWithFilters.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply sorting
    const validSortColumns = ["name", "createdAt", "updatedAt", "dueDate"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "createdAt";
    query = query.orderBy(
      `workspace.${sortColumn}` as any,
      sortDirection === "asc" ? "asc" : "desc"
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const workspaces = await query.execute();

    return json({
      data: workspaces.map((w) => {
        const taskCount = Number(w.taskCount || 0);
        const completedTaskCount = Number(w.completedTaskCount || 0);
        const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
        const isOverdue = w.dueDate && new Date(w.dueDate) < new Date() && progress < 100;

        return {
          ...w,
          memberCount: Number(w.memberCount || 0),
          taskCount,
          completedTaskCount,
          progress,
          isOverdue: !!isOverdue,
          lastActivityAt: w.lastActivityAt || null,
        };
      }),
      total,
    });
  });
}
