import { database } from "@repo/database";
import { memberService } from "./member";

export interface AdminAccessResult {
  canAccess: boolean;
  isPlatformAdmin: boolean;
  managerWorkspaceIds: string[];
}

export const adminAccessService = {
  /**
   * Check if a user can access the admin panel.
   * Returns access info including whether they're a platform admin and which workspaces they manage.
   */
  async checkAccess(userId: string): Promise<AdminAccessResult> {
    // Get user's platform admin status
    const user = await database
      .selectFrom("user")
      .select(["id", "isPlatformAdmin"])
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      return { canAccess: false, isPlatformAdmin: false, managerWorkspaceIds: [] };
    }

    const isPlatformAdmin = user.isPlatformAdmin === true;

    // Platform admins can access everything
    if (isPlatformAdmin) {
      return { canAccess: true, isPlatformAdmin: true, managerWorkspaceIds: [] };
    }

    // Check if user is a manager of any workspace
    const managerWorkspaceIds = await memberService.getWorkspaceIdsWhereManager(userId);
    const canAccess = managerWorkspaceIds.length > 0;

    return { canAccess, isPlatformAdmin: false, managerWorkspaceIds };
  },

  /**
   * Get the workspace IDs that a user can administer.
   * Platform admins get null (meaning all workspaces).
   * Workspace managers get their specific workspace IDs.
   */
  async getManagerScope(userId: string): Promise<string[] | null> {
    const access = await this.checkAccess(userId);

    if (!access.canAccess) {
      return [];
    }

    // Platform admin can access all workspaces
    if (access.isPlatformAdmin) {
      return null; // null means no filter (all workspaces)
    }

    return access.managerWorkspaceIds;
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
