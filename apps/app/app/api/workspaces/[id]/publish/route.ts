import { workspaceService, memberService, invitationService } from "@/lib/services";
import { sendInvitationEmail } from "@repo/email";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/workspaces/[id]/publish - Publish a workspace (enable notifications)
 *
 * This also sends invitation emails to any pending invitations.
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Check if user is admin of this workspace
    const member = await memberService.getMember(id, user.id);
    if (!member || member.role !== "admin") {
      return errorResponse("Only workspace admins can publish workspaces", 403);
    }

    const workspace = await workspaceService.publish(id, {
      actorId: user.id,
      source: "web",
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // Send invitation emails to all pending invitations for this workspace
    const pendingInvitations = await invitationService.getByWorkspaceId(id);
    let emailsSent = 0;
    let emailsFailed = 0;

    if (pendingInvitations.length > 0) {
      const h = await headers();
      const host = h.get("host") || "localhost:3000";
      const protocol = host.includes("localhost") ? "http" : "https";

      for (const invitation of pendingInvitations) {
        // Skip expired invitations
        if (new Date() > invitation.expiresAt) continue;

        try {
          const inviteUrl = `${protocol}://${host}/invite/${invitation.token}`;
          await sendInvitationEmail({
            to: invitation.email,
            workspaceName: workspace.name,
            inviterName: user.name || user.email,
            role: invitation.role,
            inviteUrl,
            expiresAt: invitation.expiresAt.toISOString(),
          });
          emailsSent++;
        } catch (error) {
          console.error(`Failed to send invitation email to ${invitation.email}:`, error);
          emailsFailed++;
        }
      }

      if (emailsSent > 0) {
        console.log(`[publish] Sent ${emailsSent} invitation emails for workspace ${id}`);
      }
    }

    return json({
      success: true,
      workspace,
      invitationEmailsSent: emailsSent,
      invitationEmailsFailed: emailsFailed,
    });
  });
}

/**
 * DELETE /api/workspaces/[id]/publish - Unpublish a workspace (disable notifications)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Check if user is admin of this workspace
    const member = await memberService.getMember(id, user.id);
    if (!member || member.role !== "admin") {
      return errorResponse("Only workspace admins can unpublish workspaces", 403);
    }

    const workspace = await workspaceService.unpublish(id, {
      actorId: user.id,
      source: "web",
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return json({ success: true, workspace });
  });
}
