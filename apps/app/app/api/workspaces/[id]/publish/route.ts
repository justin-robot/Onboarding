import { workspaceService, memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/workspaces/[id]/publish - Publish a workspace (enable notifications)
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

    return json({ success: true, workspace });
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
