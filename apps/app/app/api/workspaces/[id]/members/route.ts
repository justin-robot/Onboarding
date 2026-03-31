import { memberService } from "@/lib/services";
import { database } from "@repo/database";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/workspaces/[id]/members - List workspace members
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId } = await params;

    // Verify user has access to the workspace (member or platform admin)
    const hasAccess = await memberService.hasWorkspaceAccess(workspaceId, user.id);
    if (!hasAccess) {
      return errorResponse("Not a member of this workspace", 403);
    }

    // Get members with user info
    const members = await database
      .selectFrom("workspace_member")
      .innerJoin("user", "user.id", "workspace_member.userId")
      .select([
        "workspace_member.id",
        "workspace_member.userId",
        "workspace_member.role",
        "workspace_member.createdAt",
        "user.name",
        "user.email",
        "user.image",
      ])
      .where("workspace_member.workspaceId", "=", workspaceId)
      .execute();

    return json(members);
  });
}
