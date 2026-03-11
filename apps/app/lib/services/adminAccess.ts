import { database } from "@repo/database";
import { memberService } from "./member";

export interface AdminAccessResult {
  canAccess: boolean;
  isPlatformAdmin: boolean;
  adminWorkspaceIds: string[];
}

export const adminAccessService = {
  /**
   * Check if a user can access the admin panel.
   * Returns access info including whether they're a platform admin and which workspaces they admin.
   */
  async checkAccess(userId: string): Promise<AdminAccessResult> {
    // Get user's platform admin status
    const user = await database
      .selectFrom("user")
      .select(["id", "isPlatformAdmin"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      return { canAccess: false, isPlatformAdmin: false, adminWorkspaceIds: [] };
    }

    const isPlatformAdmin = user.isPlatformAdmin === true;

    // Platform admins can access everything
    if (isPlatformAdmin) {
      return { canAccess: true, isPlatformAdmin: true, adminWorkspaceIds: [] };
    }

    // Check if user is admin of any workspace
    const adminWorkspaceIds = await memberService.getWorkspaceIdsWhereAdmin(userId);
    const canAccess = adminWorkspaceIds.length > 0;

    return { canAccess, isPlatformAdmin: false, adminWorkspaceIds };
  },

  /**
   * Get the workspace IDs that a user can administer.
   * Platform admins get null (meaning all workspaces).
   * Workspace admins get their specific workspace IDs.
   */
  async getAdminScope(userId: string): Promise<string[] | null> {
    const access = await this.checkAccess(userId);

    if (!access.canAccess) {
      return [];
    }

    // Platform admin can access all workspaces
    if (access.isPlatformAdmin) {
      return null; // null means no filter (all workspaces)
    }

    return access.adminWorkspaceIds;
  },

  /**
   * Check if a user is a platform admin
   */
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const user = await database
      .selectFrom("user")
      .select("isPlatformAdmin")
      .where("id", "=", userId)
      .executeTakeFirst();

    return user?.isPlatformAdmin === true;
  },

  /**
   * Set a user's platform admin status
   */
  async setPlatformAdmin(userId: string, isPlatformAdmin: boolean): Promise<void> {
    await database
      .updateTable("user")
      .set({ isPlatformAdmin, updatedAt: new Date() })
      .where("id", "=", userId)
      .execute();
  },
};
