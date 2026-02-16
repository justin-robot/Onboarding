import { database } from "../index";
import { auditLogService, type AuditContext } from "./auditLog";
import type { WorkspaceMember } from "../schemas/main";

// Role type for workspace members
export type MemberRole = "admin" | "account_manager" | "user";

export const memberService = {
  /**
   * Add a member to a workspace
   * Throws if user is already a member of the workspace
   */
  async addMember(
    input: {
      workspaceId: string;
      userId: string;
      role: MemberRole;
    },
    auditContext?: AuditContext
  ): Promise<WorkspaceMember> {
    // Check for existing membership
    const existing = await database
      .selectFrom("workspace_member")
      .selectAll()
      .where("workspaceId", "=", input.workspaceId)
      .where("userId", "=", input.userId)
      .executeTakeFirst();

    if (existing) {
      throw new Error("User is already a member of this workspace");
    }

    const member = await database
      .insertInto("workspace_member")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId: input.workspaceId,
        eventType: "workspace.member_added",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { memberId: input.userId, role: input.role },
      });
    }

    return member;
  },

  /**
   * Remove a member from a workspace
   */
  async removeMember(
    workspaceId: string,
    userId: string,
    auditContext?: AuditContext
  ): Promise<boolean> {
    const result = await database
      .deleteFrom("workspace_member")
      .where("workspaceId", "=", workspaceId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    const removed = (result.numDeletedRows ?? 0n) > 0n;

    if (removed && auditContext) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "workspace.member_removed",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { memberId: userId },
      });
    }

    return removed;
  },

  /**
   * Update a member's role
   */
  async updateRole(
    workspaceId: string,
    userId: string,
    role: MemberRole,
    auditContext?: AuditContext
  ): Promise<WorkspaceMember | null> {
    // Get current role for audit
    const current = auditContext ? await this.getMember(workspaceId, userId) : null;

    const result = await database
      .updateTable("workspace_member")
      .set({
        role,
        updatedAt: new Date(),
      })
      .where("workspaceId", "=", workspaceId)
      .where("userId", "=", userId)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext && current) {
      await auditLogService.logEvent({
        workspaceId,
        eventType: "workspace.member_role_changed",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { memberId: userId, fromRole: current.role, toRole: role },
      });
    }

    return result ?? null;
  },

  /**
   * Get all members for a workspace
   */
  async getByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    return database
      .selectFrom("workspace_member")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .execute();
  },

  /**
   * Get a specific member by workspace and user
   */
  async getMember(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const member = await database
      .selectFrom("workspace_member")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("userId", "=", userId)
      .executeTakeFirst();

    return member ?? null;
  },

  /**
   * Check if a user is a member of a workspace
   */
  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(workspaceId, userId);
    return member !== null;
  },

  /**
   * Check if a user has a specific role in a workspace
   */
  async hasRole(workspaceId: string, userId: string, role: MemberRole): Promise<boolean> {
    const member = await this.getMember(workspaceId, userId);
    return member?.role === role;
  },

  /**
   * Get all workspace memberships for a user
   */
  async getWorkspacesForUser(userId: string): Promise<WorkspaceMember[]> {
    return database
      .selectFrom("workspace_member")
      .selectAll()
      .where("userId", "=", userId)
      .execute();
  },
};
