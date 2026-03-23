import { invitationService } from "@/lib/services";
import { database } from "@repo/database";
import { json, requireAuth, withErrorHandler } from "../../_lib/api-utils";

/**
 * GET /api/invitations/pending - List current user's pending invitations
 *
 * Returns invitations enriched with workspace and inviter info
 */
export async function GET() {
  return withErrorHandler(async () => {
    const user = await requireAuth();

    // Get invitations for the current user's email
    const rawInvitations = await invitationService.getByEmail(user.email);

    // Filter out expired and enrich with workspace/inviter info
    const now = new Date();
    const invitations = await Promise.all(
      rawInvitations
        .filter((inv) => new Date(inv.expiresAt) > now)
        .map(async (inv) => {
          // Get workspace name
          const workspace = await database
            .selectFrom("workspace")
            .select(["name"])
            .where("id", "=", inv.workspaceId)
            .executeTakeFirst();

          // Get inviter name
          const inviter = await database
            .selectFrom("user")
            .select(["name", "email"])
            .where("id", "=", inv.invitedBy)
            .executeTakeFirst();

          return {
            id: inv.id,
            token: inv.token,
            email: inv.email,
            role: inv.role,
            workspaceId: inv.workspaceId,
            workspaceName: workspace?.name || "Unknown Workspace",
            inviterName: inviter?.name || inviter?.email || "Someone",
            expiresAt: inv.expiresAt.toISOString(),
            createdAt: inv.createdAt.toISOString(),
          };
        })
    );

    return json(invitations);
  });
}
