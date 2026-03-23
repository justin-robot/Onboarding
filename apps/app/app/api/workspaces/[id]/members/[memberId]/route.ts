import { memberService } from "@/lib/services";
import { json, errorResponse, requireAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string; memberId: string }> };

/**
 * GET /api/workspaces/[id]/members/[memberId] - Get a specific member
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId, memberId } = await params;

    // Verify user is a member of the workspace
    const isMember = await memberService.isMember(workspaceId, user.id);
    if (!isMember) {
      return errorResponse("Not a member of this workspace", 403);
    }

    const member = await memberService.getMember(workspaceId, memberId);
    if (!member) {
      return errorResponse("Member not found", 404);
    }

    return json(member);
  });
}

/**
 * PATCH /api/workspaces/[id]/members/[memberId] - Update member role
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId, memberId } = await params;

    // Verify user is an admin of the workspace
    const isAdmin = await memberService.hasRole(workspaceId, user.id, "admin");
    if (!isAdmin) {
      return errorResponse("Only admins can update member roles", 403);
    }

    // Cannot change your own role
    if (memberId === user.id) {
      return errorResponse("Cannot change your own role", 400);
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !["admin", "user"].includes(role)) {
      return errorResponse("Invalid role. Must be 'admin' or 'user'", 400);
    }

    const updated = await memberService.updateRole(workspaceId, memberId, role, {
      actorId: user.id,
      source: "web",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    if (!updated) {
      return errorResponse("Member not found", 404);
    }

    return json(updated);
  });
}

/**
 * DELETE /api/workspaces/[id]/members/[memberId] - Remove member from workspace
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const user = await requireAuth();
    const { id: workspaceId, memberId } = await params;

    // Verify user is an admin of the workspace
    const isAdmin = await memberService.hasRole(workspaceId, user.id, "admin");
    if (!isAdmin) {
      return errorResponse("Only admins can remove members", 403);
    }

    // Cannot remove yourself
    if (memberId === user.id) {
      return errorResponse("Cannot remove yourself from the workspace", 400);
    }

    const removed = await memberService.removeMember(workspaceId, memberId, {
      actorId: user.id,
      source: "web",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    if (!removed) {
      return errorResponse("Member not found", 404);
    }

    return json({ success: true });
  });
}
