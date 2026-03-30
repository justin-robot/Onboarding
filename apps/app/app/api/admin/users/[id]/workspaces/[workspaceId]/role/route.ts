import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler, ValidationError, ForbiddenError, NotFoundError } from "../../../../../../_lib/api-utils";
import type { NextRequest } from "next/server";
import { memberService } from "@/lib/services/member";

type Params = { params: Promise<{ id: string; workspaceId: string }> };

/**
 * PATCH /api/admin/users/[id]/workspaces/[workspaceId]/role - Update user's role in a workspace
 * Only workspace admins can update roles within their workspaces
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { user, isPlatformAdmin, workspaceIds } = await requireAdminAuth();

    const { id: userId, workspaceId } = await params;
    const body = await request.json();
    const { role } = body;

    // Validate role
    const validRoles = ["manager", "member"];
    if (!role || !validRoles.includes(role)) {
      throw new ValidationError("Role must be one of: manager, member");
    }

    // Check if user has access to this workspace
    if (!isPlatformAdmin) {
      if (workspaceIds === null || !workspaceIds.includes(workspaceId)) {
        throw new ForbiddenError("You do not have admin access to this workspace");
      }
    }

    // Check if the target user is a member of this workspace
    const membership = await memberService.getMember(workspaceId, userId);
    if (!membership) {
      throw new NotFoundError("User is not a member of this workspace");
    }

    // Prevent demoting yourself if you're the last manager
    if (user.id === userId && role !== "manager") {
      const managers = await database
        .selectFrom("workspace_member")
        .select("userId")
        .where("workspaceId", "=", workspaceId)
        .where("role", "=", "manager")
        .execute();

      if (managers.length === 1 && managers[0].userId === userId) {
        throw new ValidationError("Cannot demote yourself - you are the last manager of this workspace");
      }
    }

    // Update the role
    const updatedMember = await memberService.updateRole(workspaceId, userId, role, {
      actorId: user.id,
      source: "admin",
    });

    if (!updatedMember) {
      throw new NotFoundError("Failed to update member role");
    }

    return json({
      success: true,
      data: {
        workspaceId,
        userId,
        role: updatedMember.role,
      },
    });
  });
}
