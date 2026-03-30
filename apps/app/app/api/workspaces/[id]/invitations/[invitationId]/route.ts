import { invitationService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string; invitationId: string }> };

/**
 * DELETE /api/workspaces/[id]/invitations/[invitationId] - Cancel an invitation
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId, invitationId } = await params;

    // Verify user is a member of the workspace
    const membership = await memberService.getMember(workspaceId, user.id);
    if (!membership) {
      return errorResponse("Not a member of this workspace", 403);
    }

    // Only managers can cancel invitations
    if (membership.role !== "manager") {
      return errorResponse("Only managers can cancel invitations", 403);
    }

    // Cancel the invitation
    const deleted = await invitationService.cancel(invitationId);
    if (!deleted) {
      return errorResponse("Invitation not found", 404);
    }

    return json({ success: true });
  });
}
