import { database } from "@repo/database";
import { memberService, type MemberRole } from "./member";

/**
 * Access control errors
 */
export class AccessDeniedError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace not found: ${workspaceId}`);
    this.name = "WorkspaceNotFoundError";
  }
}

export class NotWorkspaceMemberError extends AccessDeniedError {
  constructor(workspaceId: string) {
    super(`You are not a member of this workspace`);
    this.name = "NotWorkspaceMemberError";
  }
}

export class InsufficientPermissionsError extends AccessDeniedError {
  constructor(requiredRole: MemberRole) {
    super(`This action requires ${requiredRole} role or higher`);
    this.name = "InsufficientPermissionsError";
  }
}

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
const roleHierarchy: MemberRole[] = ["user", "admin"];

/**
 * Check if a role meets the minimum required role
 */
function hasMinimumRole(userRole: MemberRole, requiredRole: MemberRole): boolean {
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

/**
 * Access control service for workspace authorization
 */
export const accessService = {
  /**
   * Check if a user has access to a workspace
   * Returns the member record if access is granted
   * Throws NotWorkspaceMemberError if not a member
   */
  async requireWorkspaceAccess(
    workspaceId: string,
    userId: string
  ): Promise<{ role: MemberRole }> {
    const member = await memberService.getMember(workspaceId, userId);

    if (!member) {
      throw new NotWorkspaceMemberError(workspaceId);
    }

    return { role: member.role as MemberRole };
  },

  /**
   * Check if a user has a minimum role in a workspace
   * Throws InsufficientPermissionsError if role is insufficient
   */
  async requireMinimumRole(
    workspaceId: string,
    userId: string,
    requiredRole: MemberRole
  ): Promise<{ role: MemberRole }> {
    const { role } = await this.requireWorkspaceAccess(workspaceId, userId);

    if (!hasMinimumRole(role, requiredRole)) {
      throw new InsufficientPermissionsError(requiredRole);
    }

    return { role };
  },

  /**
   * Check if a user can read a workspace
   * Any member can read
   */
  async canReadWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.requireWorkspaceAccess(workspaceId, userId);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a user can update a workspace
   * Requires admin role
   */
  async canUpdateWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.requireMinimumRole(workspaceId, userId, "admin");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a user can manage members in a workspace
   * Requires admin role
   */
  async canManageMembers(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.requireMinimumRole(workspaceId, userId, "admin");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a user can complete tasks in a workspace
   * Any member can complete tasks (subject to assignment checks)
   */
  async canCompleteTasks(workspaceId: string, userId: string): Promise<boolean> {
    return this.canReadWorkspace(workspaceId, userId);
  },

  /**
   * Check if a user can create/edit sections
   * Requires admin role
   */
  async canManageSections(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.requireMinimumRole(workspaceId, userId, "admin");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a user can create/edit tasks
   * Requires admin role
   */
  async canManageTasks(workspaceId: string, userId: string): Promise<boolean> {
    try {
      await this.requireMinimumRole(workspaceId, userId, "admin");
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get a task and verify workspace access in one call
   * Returns the task if user has access
   * Throws appropriate errors otherwise
   */
  async getTaskWithAccessCheck(
    taskId: string,
    userId: string
  ): Promise<{
    task: {
      id: string;
      sectionId: string;
      workspaceId: string;
      [key: string]: unknown;
    };
    role: MemberRole;
  }> {
    // Get task with section and workspace info
    const task = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .selectAll("task")
      .select("section.workspaceId")
      .where("task.id", "=", taskId)
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check workspace access
    const { role } = await this.requireWorkspaceAccess(task.workspaceId, userId);

    return { task, role };
  },

  /**
   * Get workspaces accessible by a user
   */
  async getAccessibleWorkspaces(userId: string): Promise<string[]> {
    const memberships = await memberService.getWorkspacesForUser(userId);
    return memberships.map((m) => m.workspaceId);
  },
};
