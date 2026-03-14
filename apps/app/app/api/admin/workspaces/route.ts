import { database } from "@repo/database";
import { sql } from "kysely";
import { json, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

// Check if isTemplate column exists (cached for performance)
let isTemplateColumnExists: boolean | null = null;

async function checkIsTemplateColumn(): Promise<boolean> {
  if (isTemplateColumnExists !== null) return isTemplateColumnExists;

  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspace' AND column_name = 'isTemplate'
      ) as exists
    `.execute(database);
    isTemplateColumnExists = (result.rows[0] as any)?.exists === true;
  } catch {
    isTemplateColumnExists = false;
  }
  return isTemplateColumnExists;
}

/**
 * GET /api/admin/workspaces - List workspaces (scoped by admin access)
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";
    const search = searchParams.get("search") || "";
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Check if isTemplate column exists (migration may not have run yet)
    const hasIsTemplateColumn = await checkIsTemplateColumn();

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

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      if (workspaceIds.length === 0) {
        // No workspaces to admin - return empty
        return json({ data: [], total: 0 });
      }
      query = query.where("workspace.id", "in", workspaceIds);
    }

    // Filter by deleted status
    if (!includeDeleted) {
      query = query.where("workspace.deletedAt", "is", null);
    }

    // Exclude templates from workspace list (only if column exists)
    if (hasIsTemplateColumn) {
      query = query.where((eb) =>
        eb.or([
          eb("workspace.isTemplate", "=", false),
          eb("workspace.isTemplate", "is", null),
        ])
      );
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

    // Get total count (with same scoping)
    let countQuery = database
      .selectFrom("workspace")
      .select((eb) => eb.fn.count("id").as("total"));

    // Apply workspace scope to count query
    if (workspaceIds !== null) {
      countQuery = countQuery.where("id", "in", workspaceIds);
    }

    let countQueryWithFilters = includeDeleted
      ? countQuery
      : countQuery.where("deletedAt", "is", null);

    // Exclude templates from count (only if column exists)
    if (hasIsTemplateColumn) {
      countQueryWithFilters = countQueryWithFilters.where((eb) =>
        eb.or([
          eb("isTemplate", "=", false),
          eb("isTemplate", "is", null),
        ])
      );
    }

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
