import { invitationService, workspaceService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../_lib/api-utils";
import type { NextRequest } from "next/server";

/**
 * POST /api/invitations/redeem - Redeem an invitation token
 *
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    const body = await request.json();
    const { token } = body;

    // Validate token
    if (!token || typeof token !== "string") {
      return errorResponse("token is required", 400);
    }

    // Get invitation to check workspace status
    const invitation = await invitationService.getByToken(token);
    if (!invitation) {
      return errorResponse("Invalid or already used invitation", 404);
    }

    // Check if workspace is published (draft workspaces cannot accept invitations)
    const workspace = await workspaceService.getById(invitation.workspaceId);
    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }
    if (!workspace.isPublished) {
      return errorResponse("This workspace is not yet available. The invitation will be active once the workspace is published.", 403);
    }

    // Redeem the invitation
    const result = await invitationService.redeem(token, user.id);

    if (!result.success) {
      if (result.error === "INVALID_TOKEN") {
        return errorResponse("Invalid or already used invitation", 404);
      }
      if (result.error === "EXPIRED") {
        return errorResponse("This invitation has expired", 410);
      }
      return errorResponse("Failed to redeem invitation", 500);
    }

    return json({
      success: true,
      workspaceId: result.member!.workspaceId,
      role: result.member!.role,
    });
  });
}
