import { invitationService, memberService } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/invitations - List pending invitations
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("Not a member of this workspace", 403);
    }

    const invitations = await invitationService.getByWorkspaceId(workspaceId);

    // Return simplified invitation data (don't expose tokens)
    return json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }))
    );
  });
}

/**
 * POST /api/workspaces/[id]/invitations - Create a new invitation
 *
 * Body: { email: string, role?: "admin" | "member" | "viewer" }
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user is a member of the workspace (preferably admin)
    const membership = await memberService.getMember(workspaceId, user.id);
    if (!membership) {
      return errorResponse("Not a member of this workspace", 403);
    }

    // Only admins can invite
    if (membership.role !== "admin") {
      return errorResponse("Only admins can invite members", 403);
    }

    const body = await request.json();
    const { email, role = "user" } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return errorResponse("email is required", 400);
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Invalid email format", 400);
    }

    // Validate role
    const validRoles = ["admin", "account_manager", "user"];
    if (!validRoles.includes(role)) {
      return errorResponse(`role must be one of: ${validRoles.join(", ")}`, 400);
    }

    // Create invitation
    const result = await invitationService.create({
      workspaceId,
      email,
      role,
      invitedBy: user.id,
    });

    if (!result.success) {
      if (result.error === "ALREADY_MEMBER") {
        return errorResponse("This user is already a member of the workspace", 409);
      }
      if (result.error === "ALREADY_INVITED") {
        return errorResponse("An invitation has already been sent to this email", 409);
      }
      return errorResponse("Failed to create invitation", 500);
    }

    // Return invitation (with token for email sending)
    return json({
      id: result.invitation!.id,
      email: result.invitation!.email,
      role: result.invitation!.role,
      token: result.invitation!.token,
      expiresAt: result.invitation!.expiresAt,
    });
  });
}
