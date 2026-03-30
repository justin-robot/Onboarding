import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id] - Get a specific user's basic info
 * Platform admins can view any user
 * Workspace managers can only view users in their workspaces
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();

    const { id: userId } = await params;

    // If user has no admin workspaces, return not found
    if (workspaceIds !== null && workspaceIds.length === 0) {
      return json({ error: "User not found" }, 404);
    }

    // For workspace managers, verify the user is in one of their workspaces
    if (workspaceIds !== null) {
      const membership = await database
        .selectFrom("workspace_member")
        .where("workspace_member.userId", "=", userId)
        .where("workspace_member.workspaceId", "in", workspaceIds)
        .select("workspace_member.id")
        .executeTakeFirst();

      if (!membership) {
        return json({ error: "User not found" }, 404);
      }
    }

    // Get user basic info
    const user = await database
      .selectFrom("user")
      .select(["id", "name", "email", "role"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    return json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  });
}
