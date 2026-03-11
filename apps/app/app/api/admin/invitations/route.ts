import { database } from "@repo/database";
import { invitationService } from "@/lib/services";
import { json, errorResponse, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/invitations - List pending invitations (scoped by admin access)
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
    const workspaceId = searchParams.get("workspaceId") || "";
    const includeExpired = searchParams.get("includeExpired") === "true";

    // If user has no admin workspaces, return empty
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ data: [], total: 0 });
    }

    // Build base query with joins
    let query = database
      .selectFrom("pending_invitation")
      .innerJoin("workspace", "workspace.id", "pending_invitation.workspaceId")
      .leftJoin("user as inviter", "inviter.id", "pending_invitation.invitedBy")
      .select([
        "pending_invitation.id",
        "pending_invitation.email",
        "pending_invitation.role",
        "pending_invitation.token",
        "pending_invitation.expiresAt",
        "pending_invitation.createdAt",
        "workspace.id as workspaceId",
        "workspace.name as workspaceName",
        "inviter.name as inviterName",
        "inviter.email as inviterEmail",
      ]);

    // Scope by workspace IDs if not platform admin
    if (workspaceIds !== null) {
      query = query.where("workspace.id", "in", workspaceIds);
    }

    // Filter expired
    if (!includeExpired) {
      query = query.where("pending_invitation.expiresAt", ">", new Date());
    }

    // Search filter
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb("pending_invitation.email", "ilike", `%${search}%`),
          eb("workspace.name", "ilike", `%${search}%`),
        ])
      );
    }

    // Workspace filter (additional filter on top of scope)
    if (workspaceId) {
      query = query.where("pending_invitation.workspaceId", "=", workspaceId);
    }

    // Get total count (with same scoping)
    let countQuery = database
      .selectFrom("pending_invitation")
      .innerJoin("workspace", "workspace.id", "pending_invitation.workspaceId")
      .select((eb) => eb.fn.count("pending_invitation.id").as("total"));

    // Apply workspace scope to count query
    if (workspaceIds !== null) {
      countQuery = countQuery.where("workspace.id", "in", workspaceIds);
    }

    if (!includeExpired) {
      countQuery = countQuery.where("pending_invitation.expiresAt", ">", new Date());
    }
    if (search) {
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("pending_invitation.email", "ilike", `%${search}%`),
          eb("workspace.name", "ilike", `%${search}%`),
        ])
      );
    }
    if (workspaceId) {
      countQuery = countQuery.where("pending_invitation.workspaceId", "=", workspaceId);
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.total || 0);

    // Apply sorting
    const validSortColumns = ["email", "createdAt", "expiresAt", "role"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "createdAt";
    query = query.orderBy(
      `pending_invitation.${sortColumn}` as any,
      sortDirection === "asc" ? "asc" : "desc"
    );

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const invitations = await query.execute();

    return json({
      data: invitations.map((inv) => ({
        ...inv,
        isExpired: new Date(inv.expiresAt) < new Date(),
      })),
      total,
    });
  });
}

/**
 * DELETE /api/admin/invitations - Cancel an invitation
 */
export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse("Invitation ID is required", 400);
    }

    // Check if the invitation belongs to a workspace the user can admin
    if (workspaceIds !== null) {
      const invitation = await database
        .selectFrom("pending_invitation")
        .select("workspaceId")
        .where("id", "=", id)
        .executeTakeFirst();

      if (!invitation || !workspaceIds.includes(invitation.workspaceId)) {
        return errorResponse("Invitation not found", 404);
      }
    }

    const success = await invitationService.cancel(id);

    if (!success) {
      return errorResponse("Invitation not found", 404);
    }

    return json({ success: true });
  });
}
