import { invitationService } from "@/lib/services";
import { database } from "@repo/database";
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

    // Get workspace name
    const workspace = await database
      .selectFrom("workspace")
      .select(["id", "name"])
      .where("id", "=", invitation.workspaceId)
      .executeTakeFirst();

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // Get inviter name
    const inviter = await database
      .selectFrom("user")
      .select(["name", "email"])
      .where("id", "=", invitation.invitedBy)
      .executeTakeFirst();

    return json({
      email: invitation.email,
      role: invitation.role,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      inviterName: inviter?.name || inviter?.email || "Someone",
      expiresAt: invitation.expiresAt,
    });
  });
}
