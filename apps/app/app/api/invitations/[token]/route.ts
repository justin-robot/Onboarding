import { invitationService } from "@/lib/services";
import { database } from "@repo/database";
import { sql } from "kysely";
import { json, errorResponse, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/invitations/[token] - Get invitation details (public)
 *
 * Returns invitation info for display without requiring auth
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { token } = await params;

    // Get invitation by token
    const invitation = await invitationService.getByToken(token);

    if (!invitation) {
      return errorResponse("Invitation not found or already used", 404);
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return errorResponse("This invitation has expired", 410);
    }

    // Get workspace name and publish status
    const workspace = await database
      .selectFrom("workspace")
      .select(["id", "name", "isPublished"])
      .where("id", "=", invitation.workspaceId)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // Don't show invitations for draft (unpublished) workspaces
    if (!workspace.isPublished) {
      return errorResponse("This workspace is not yet available. The invitation will be active once the workspace is published.", 403);
    }

    // Get inviter name
    const inviter = await database
      .selectFrom("user")
      .select(["name", "email"])
      .where("id", "=", invitation.invitedBy)
      .executeTakeFirst();

    // Check if an account exists for the invited email (case-insensitive)
    const existingUser = await database
      .selectFrom("user")
      .select(["id"])
      .where(sql`lower(email) = ${invitation.email.toLowerCase()}`)
      .executeTakeFirst();

    return json({
      email: invitation.email,
      role: invitation.role,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      inviterName: inviter?.name || inviter?.email || "Someone",
      expiresAt: invitation.expiresAt,
      accountExists: !!existingUser,
    });
  });
}
