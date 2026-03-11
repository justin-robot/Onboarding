import { json, requireAdminAuth, withErrorHandler } from "../../_lib/api-utils";

/**
 * GET /api/admin/me - Get current admin's profile and access info
 */
export async function GET() {
  return withErrorHandler(async () => {
    const { user, isPlatformAdmin, workspaceIds } = await requireAdminAuth();

    return json({
      id: user.id,
      email: user.email,
      name: user.name,
      isPlatformAdmin,
      adminWorkspaceIds: workspaceIds,
    });
  });
}
