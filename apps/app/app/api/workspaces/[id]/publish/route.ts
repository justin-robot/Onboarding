import { workspaceService, memberService, invitationService } from "@/lib/services";
import { sendInvitationEmail } from "@repo/email";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/workspaces/[id]/publish - Publish a workspace (enable notifications)
 *
 * When publishing, all pending invitations that were queued during draft mode
 * will have their invitation emails sent.
 */
export async function POST(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id } = await params;

    // Check if user is manager of this workspace
    const member = await memberService.getMember(id, user.id);
    if (!member || member.role !== "manager") {
      return errorResponse("Only workspace managers can publish workspaces", 403);
    }

    // Check if already published
    const existingWorkspace = await workspaceService.getById(id);
    if (!existingWorkspace) {
      return errorResponse("Workspace not found", 404);
    }

    const wasAlreadyPublished = existingWorkspace.isPublished;

    const workspace = await workspaceService.publish(id, {
      actorId: user.id,
      source: "web",
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    // If workspace was in draft mode, send all pending invitation emails now
    let invitationsSent = 0;
    if (!wasAlreadyPublished) {
      const pendingInvitations = await invitationService.getByWorkspaceId(id);

      if (pendingInvitations.length > 0) {
        const h = await headers();
        const host = h.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";

        console.log(`[publish] Sending ${pendingInvitations.length} queued invitations for workspace ${id}...`);

        // Send all invitation emails (non-blocking, continue even if some fail)
        for (const invitation of pendingInvitations) {
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

            invitationsSent++;
            console.log(`✓ Invitation email sent to ${invitation.email}`);
          } catch (emailError) {
            console.error(`Failed to send invitation email to ${invitation.email}:`, emailError);
          }
        }

        console.log(`[publish] Sent ${invitationsSent}/${pendingInvitations.length} invitation emails`);
      }
    }

    return json({
      success: true,
      workspace,
      invitationsSent,
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

    // Check if user is manager of this workspace
    const member = await memberService.getMember(id, user.id);
    if (!member || member.role !== "manager") {
      return errorResponse("Only workspace managers can unpublish workspaces", 403);
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
