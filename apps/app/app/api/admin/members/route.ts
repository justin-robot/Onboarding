import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/members - List all workspace members with pagination
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
    const workspaceId = searchParams.get("workspaceId") || "";
    const role = searchParams.get("role") || "";

    // Build base query with joins
    let query = database
      .selectFrom("workspace_member")
      .innerJoin("user", "user.id", "workspace_member.userId")
      .innerJoin("workspace", "workspace.id", "workspace_member.workspaceId")
      .select([
        "workspace_member.id",
        "workspace_member.role",
        "workspace_member.createdAt",
        "workspace_member.updatedAt",
        "user.id as userId",
        "user.name as userName",
        "user.email as userEmail",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
      ])
      .where("workspace.deletedAt", "is", null);

    // Search filter (by user name or email)
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb("user.name", "ilike", `%${search}%`),
          eb("user.email", "ilike", `%${search}%`),
          eb("workspace.name", "ilike", `%${search}%`),
        ])
      );
    }

    // Workspace filter
    if (workspaceId) {
      query = query.where("workspace_member.workspaceId", "=", workspaceId);
    }

    // Role filter
    if (role) {
      query = query.where("workspace_member.role", "=", role as any);
    }

    // Get total count
    let countQuery = database
      .selectFrom("workspace_member")
      .innerJoin("user", "user.id", "workspace_member.userId")
      .innerJoin("workspace", "workspace.id", "workspace_member.workspaceId")
      .select((eb) => eb.fn.count("workspace_member.id").as("total"))
      .where("workspace.deletedAt", "is", null);

    if (search) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("user.name", "ilike", `%${search}%`),
          eb("user.email", "ilike", `%${search}%`),
          eb("workspace.name", "ilike", `%${search}%`),
        ])
      );
    }
    if (workspaceId) {
      countQuery = countQuery.where("workspace_member.workspaceId", "=", workspaceId);
    }
    if (role) {
      countQuery = countQuery.where("workspace_member.role", "=", role as any);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply sorting
    const validSortColumns = ["createdAt", "role"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "createdAt";
    query = query.orderBy(
      `workspace_member.${sortColumn}` as any,
      sortDirection === "asc" ? "asc" : "desc"
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const members = await query.execute();

    return json({
      data: members,
      total,
    });
  });
}
