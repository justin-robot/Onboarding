import { database } from "@repo/database";
import { invitationService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * GET /api/admin/invitations - List all pending invitations with pagination
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
    const includeExpired = searchParams.get("includeExpired") === "true";

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

    // Workspace filter
    if (workspaceId) {
      query = query.where("pending_invitation.workspaceId", "=", workspaceId);
    }

    // Get total count
    let countQuery = database
      .selectFrom("pending_invitation")
      .innerJoin("workspace", "workspace.id", "pending_invitation.workspaceId")
      .select((eb) => eb.fn.count("pending_invitation.id").as("total"));

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
    const user = await requireAuth();

    if (user.role !== "admin") {
      return errorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return errorResponse("Invitation ID is required", 400);
    }

    const success = await invitationService.cancel(id);

    if (!success) {
      return errorResponse("Invitation not found", 404);
    }

    return json({ success: true });
  });
}
