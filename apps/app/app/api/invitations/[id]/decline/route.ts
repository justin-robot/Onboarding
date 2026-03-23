import { invitationService } from "@/lib/services";
import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/invitations/[id]/decline - Decline an invitation
 *
 * Only the invited user can decline their own invitation
 */
export async function POST(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: invitationId } = await params;

    // Get the invitation
    const invitation = await database
      .selectFrom("pending_invitation")
      .selectAll()
      .where("id", "=", invitationId)
      .executeTakeFirst();

    if (!invitation) {
      return errorResponse("Invitation not found", 404);
    }

    // Verify the invitation belongs to the current user
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      return errorResponse("You can only decline invitations sent to your email", 403);
    }

    // Delete the invitation
    const deleted = await invitationService.cancel(invitationId);

    if (!deleted) {
      return errorResponse("Failed to decline invitation", 500);
    }

    return json({ success: true });
  });
}
