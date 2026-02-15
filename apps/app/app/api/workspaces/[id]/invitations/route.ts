import { invitationService, memberService, workspaceService } from "@repo/database";
import { sendInvitationEmail } from "@repo/email";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

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

    // Check if user is admin to include tokens
    const membership = await memberService.getMember(workspaceId, user.id);
    const isAdmin = membership?.role === "admin";

    const invitations = await invitationService.getByWorkspaceId(workspaceId);

    // Return invitation data (include tokens for admins)
    return json(
      invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        ...(isAdmin && { token: inv.token }),
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

    const invitation = result.invitation!;

    // Send invitation email (non-blocking, don't fail if email fails)
    try {
      const workspace = await workspaceService.getById(workspaceId);
      const h = await headers();
      const host = h.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";
      const inviteUrl = `${protocol}://${host}/invite/${invitation.token}`;

      console.log(`Sending invitation email to ${email}...`);
      await sendInvitationEmail({
        to: email,
        workspaceName: workspace?.name || "Workspace",
        inviterName: user.name || user.email,
        role,
        inviteUrl,
        expiresAt: invitation.expiresAt.toISOString(),
      });
      console.log(`✓ Invitation email sent to ${email}`);
    } catch (emailError) {
      // Log but don't fail - the invitation was created successfully
      console.error("Failed to send invitation email:", emailError);
    }

    // Return invitation (with token for copy link feature)
    return json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });
  });
}
