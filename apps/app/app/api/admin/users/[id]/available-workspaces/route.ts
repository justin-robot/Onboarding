import { database } from "@repo/database";
import { json, requireAdminAuth, withErrorHandler } from "../../../../_lib/api-utils";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/users/[id]/available-workspaces
 * Get workspaces that the user is NOT a member of, scoped by admin's permissions
 * - Platform admins: see all workspaces
 * - Managers: see only workspaces they manage
 */
export async function GET(_request: NextRequest, { params }: Params) {
  return withErrorHandler(async () => {
    const { workspaceIds } = await requireAdminAuth();
    const { id: userId } = await params;

    // Get workspace IDs the user is already a member of
    const existingMemberships = await database
      .selectFrom("workspace_member")
      .select("workspaceId")
      .where("userId", "=", userId)
      .execute();

    const existingWorkspaceIds = existingMemberships.map((m) => m.workspaceId);

    // Query available workspaces
    let query = database
      .selectFrom("workspace")
      .select(["id", "name", "description"])
      .where("deletedAt", "is", null)
      .where((eb) =>
        eb.or([eb("isTemplate", "is", null), eb("isTemplate", "=", false)])
      );

    // Exclude workspaces user is already in
    if (existingWorkspaceIds.length > 0) {
      query = query.where("id", "not in", existingWorkspaceIds);
    }

    // Scope by admin's workspaces (managers only see their managed workspaces)
    if (workspaceIds !== null) {
      if (workspaceIds.length === 0) {
        return json({ data: [] });
      }
      query = query.where("id", "in", workspaceIds);
    }

    const workspaces = await query.orderBy("name", "asc").execute();

    return json({ data: workspaces });
  });
}
