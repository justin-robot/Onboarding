import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/tasks - List all tasks with pagination
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
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const workspaceId = searchParams.get("workspaceId") || "";

    // Build base query with joins
    let query = database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select([
        "task.id",
        "task.title",
        "task.description",
        "task.type",
        "task.status",
        "task.position",
        "task.completionRule",
        "task.dueDateType",
        "task.dueDateValue",
        "task.createdAt",
        "task.updatedAt",
        "task.completedAt",
        "section.id as sectionId",
        "section.title as sectionTitle",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .select((eb) => [
        eb
          .selectFrom("task_assignee")
          .select((eb2) => eb2.fn.count("id").as("count"))
          .whereRef("task_assignee.taskId", "=", "task.id")
          .as("assigneeCount"),
      ])
      .where("task.deletedAt", "is", null);

    // Search filter
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb("task.title", "ilike", `%${search}%`),
          eb("task.description", "ilike", `%${search}%`),
        ])
      );
    }

    // Status filter
    if (status) {
      query = query.where("task.status", "=", status as any);
    }

    // Type filter
    if (type) {
      query = query.where("task.type", "=", type as any);
    }

    // Workspace filter
    if (workspaceId) {
      query = query.where("workspace.id", "=", workspaceId);
    }

    // Get total count
    let countQuery = database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .innerJoin("workspace", "workspace.id", "section.workspaceId")
      .select((eb) => eb.fn.count("task.id").as("total"))
      .where("task.deletedAt", "is", null);

    if (search) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("task.title", "ilike", `%${search}%`),
          eb("task.description", "ilike", `%${search}%`),
        ])
      );
    }
    if (status) {
      countQuery = countQuery.where("task.status", "=", status as any);
    }
    if (type) {
      countQuery = countQuery.where("task.type", "=", type as any);
    }
    if (workspaceId) {
      countQuery = countQuery.where("workspace.id", "=", workspaceId);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply sorting
    const validSortColumns = ["title", "status", "type", "createdAt", "updatedAt"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "createdAt";
    query = query.orderBy(
      `task.${sortColumn}` as any,
      sortDirection === "asc" ? "asc" : "desc"
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const tasks = await query.execute();

    return json({
      data: tasks.map((t) => ({
        ...t,
        assigneeCount: Number(t.assigneeCount || 0),
      })),
      total,
    });
  });
}
