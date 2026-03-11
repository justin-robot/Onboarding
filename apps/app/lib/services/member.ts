import { database } from "@repo/database";
import { auditLogService, type AuditContext } from "./auditLog";
import type { WorkspaceMember } from "@repo/database";

// Dynamically import ably to avoid bundling issues with Next.js
const ABLY_PATH = "./ably";
async function getAblyService() {
  if (typeof window !== "undefined") return null;
  try {
    const module = await import(/* webpackIgnore: true */ ABLY_PATH);
    return { ablyService: module.ablyService, WORKSPACE_EVENTS: module.WORKSPACE_EVENTS };
  } catch {
    return null;
  }
}

// Role type for workspace members
export type MemberRole = "admin" | "user";

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

    // Broadcast member added event (fire and forget)
    getAblyService().then((ably) => {
      if (ably) {
        // Get user info for the broadcast
        database
          .selectFrom("user")
          .select(["id", "name", "email"])
          .where("id", "=", input.userId)
          .executeTakeFirst()
          .then((user) => {
            ably.ablyService.broadcastToWorkspace(
              input.workspaceId,
              ably.WORKSPACE_EVENTS.MEMBER_ADDED,
              {
                memberId: member.id,
                userId: input.userId,
                role: input.role,
                name: user?.name,
                email: user?.email,
              }
            ).catch((err: unknown) => console.error("Failed to broadcast member added:", err));
          });
      }
    });

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

    // Broadcast member removed event (fire and forget)
    if (removed) {
      getAblyService().then((ably) => {
        if (ably) {
          ably.ablyService.broadcastToWorkspace(
            workspaceId,
            ably.WORKSPACE_EVENTS.MEMBER_REMOVED,
            { userId }
          ).catch((err: unknown) => console.error("Failed to broadcast member removed:", err));
        }
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

  /**
   * Get all members for a workspace with user info (name, email)
   */
  async getByWorkspaceIdWithUserInfo(workspaceId: string) {
    return database
      .selectFrom("workspace_member")
      .innerJoin("user", "user.id", "workspace_member.userId")
      .select([
        "workspace_member.id",
        "workspace_member.userId",
        "workspace_member.role",
        "workspace_member.createdAt",
        "user.name",
        "user.email",
      ])
      .where("workspace_member.workspaceId", "=", workspaceId)
      .execute();
  },

  /**
   * Check if a user is an admin in any workspace
   */
  async isAdminInAnyWorkspace(userId: string): Promise<boolean> {
    const result = await database
      .selectFrom("workspace_member")
      .select("id")
      .where("userId", "=", userId)
      .where("role", "=", "admin")
      .limit(1)
      .executeTakeFirst();

    return result !== undefined;
  },

  /**
   * Get all workspace IDs where a user is an admin
   */
  async getWorkspaceIdsWhereAdmin(userId: string): Promise<string[]> {
    const results = await database
      .selectFrom("workspace_member")
      .select("workspaceId")
      .where("userId", "=", userId)
      .where("role", "=", "admin")
      .execute();

    return results.map((r) => r.workspaceId);
  },

  /**
   * Get all workspaces where a user is an admin (with workspace details)
   */
  async getWorkspacesWhereAdmin(userId: string) {
    return database
      .selectFrom("workspace_member")
      .innerJoin("workspace", "workspace.id", "workspace_member.workspaceId")
      .select([
        "workspace.id",
        "workspace.name",
        "workspace.description",
        "workspace.dueDate",
        "workspace.createdAt",
        "workspace.updatedAt",
        "workspace.deletedAt",
      ])
      .where("workspace_member.userId", "=", userId)
      .where("workspace_member.role", "=", "admin")
      .execute();
  },
};
