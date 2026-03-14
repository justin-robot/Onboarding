import { database } from "@repo/database";
import { dependencyService } from "./dependency";
import { auditLogService, type AuditContext } from "./auditLog";
import type {
  Workspace,
  NewWorkspace,
  WorkspaceUpdate,
  Section,
  Task,
} from "@repo/database";

// Types for nested workspace structure
export interface WorkspaceWithNested extends Workspace {
  sections: SectionWithTasks[];
}

export interface SectionWithTasks extends Section {
  tasks: Task[];
}

// Types with lock status
export interface TaskWithLock extends Task {
  locked: boolean;
}

export interface SectionWithTasksAndLock extends Section {
  tasks: TaskWithLock[];
}

export interface WorkspaceWithNestedAndLock extends Workspace {
  sections: SectionWithTasksAndLock[];
}

export const workspaceService = {
  /**
   * Create a new workspace
   */
  async create(input: NewWorkspace, auditContext?: AuditContext): Promise<Workspace> {
    const workspace = await database
      .insertInto("workspace")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (auditContext) {
      await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "workspace.created",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: workspace.name },
      });
    }

    return workspace;
  },

  /**
   * Get a workspace by ID (excludes soft-deleted)
   */
  async getById(id: string): Promise<Workspace | null> {
    const workspace = await database
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return workspace ?? null;
  },

  /**
   * Get a workspace with nested sections and tasks
   */
  async getByIdWithNested(id: string): Promise<WorkspaceWithNested | null> {
    // First get the workspace
    const workspace = await this.getById(id);
    if (!workspace) {
      return null;
    }

    // Get sections for this workspace (ordered by position)
    const sections = await database
      .selectFrom("section")
      .selectAll()
      .where("workspaceId", "=", id)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    // Get tasks for all sections (ordered by position)
    const sectionIds = sections.map((s) => s.id);
    const tasks =
      sectionIds.length > 0
        ? await database
            .selectFrom("task")
            .selectAll()
            .where("sectionId", "in", sectionIds)
            .where("deletedAt", "is", null)
            .orderBy("position", "asc")
            .execute()
        : [];

    // Group tasks by section
    const tasksBySectionId = new Map<string, Task[]>();
    for (const task of tasks) {
      const sectionTasks = tasksBySectionId.get(task.sectionId) ?? [];
      sectionTasks.push(task);
      tasksBySectionId.set(task.sectionId, sectionTasks);
    }

    // Build nested structure
    const sectionsWithTasks: SectionWithTasks[] = sections.map((section) => ({
      ...section,
      tasks: tasksBySectionId.get(section.id) ?? [],
    }));

    return {
      ...workspace,
      sections: sectionsWithTasks,
    };
  },

  /**
   * Get a workspace with nested sections and tasks, including lock status
   */
  async getByIdWithNestedAndLockStatus(id: string): Promise<WorkspaceWithNestedAndLock | null> {
    // First get the workspace
    const workspace = await this.getById(id);
    if (!workspace) {
      return null;
    }

    // Get sections for this workspace (ordered by position)
    const sections = await database
      .selectFrom("section")
      .selectAll()
      .where("workspaceId", "=", id)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    // Get tasks for all sections (ordered by position)
    const sectionIds = sections.map((s) => s.id);
    const tasks =
      sectionIds.length > 0
        ? await database
            .selectFrom("task")
            .selectAll()
            .where("sectionId", "in", sectionIds)
            .where("deletedAt", "is", null)
            .orderBy("position", "asc")
            .execute()
        : [];

    // Compute lock status for all tasks
    const tasksWithLock: TaskWithLock[] = [];
    for (const task of tasks) {
      const unlocked = await dependencyService.isTaskUnlocked(task.id);
      tasksWithLock.push({
        ...task,
        locked: !unlocked,
      });
    }

    // Group tasks by section
    const tasksBySectionId = new Map<string, TaskWithLock[]>();
    for (const task of tasksWithLock) {
      const sectionTasks = tasksBySectionId.get(task.sectionId) ?? [];
      sectionTasks.push(task);
      tasksBySectionId.set(task.sectionId, sectionTasks);
    }

    // Build nested structure
    const sectionsWithTasks: SectionWithTasksAndLock[] = sections.map((section) => ({
      ...section,
      tasks: tasksBySectionId.get(section.id) ?? [],
    }));

    return {
      ...workspace,
      sections: sectionsWithTasks,
    };
  },

  /**
   * Update a workspace (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<WorkspaceUpdate, "id" | "createdAt" | "deletedAt">,
    auditContext?: AuditContext
  ): Promise<Workspace | null> {
    // Get current state for change tracking
    const current = auditContext ? await this.getById(id) : null;

    const result = await database
      .updateTable("workspace")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext && current) {
      // Build changes metadata
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && current[key as keyof typeof current] !== value) {
          changes[key] = { from: current[key as keyof typeof current], to: value };
        }
      }

      if (Object.keys(changes).length > 0) {
        await auditLogService.logEvent({
          workspaceId: id,
          eventType: "workspace.updated",
          actorId: auditContext.actorId,
          source: auditContext.source,
          ipAddress: auditContext.ipAddress,
          metadata: { changes },
        });
      }
    }

    return result ?? null;
  },

  /**
   * Soft delete a workspace
   */
  async softDelete(id: string, auditContext?: AuditContext): Promise<boolean> {
    const result = await database
      .updateTable("workspace")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    const deleted = (result.numUpdatedRows ?? 0n) > 0n;

    if (deleted && auditContext) {
      await auditLogService.logEvent({
        workspaceId: id,
        eventType: "workspace.deleted",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
      });
    }

    return deleted;
  },

  /**
   * List all workspaces (excludes soft-deleted)
   */
  async list(): Promise<Workspace[]> {
    return database
      .selectFrom("workspace")
      .selectAll()
      .where("deletedAt", "is", null)
      .execute();
  },

  /**
   * Restore a soft-deleted workspace
   */
  async restore(id: string): Promise<Workspace | null> {
    const result = await database
      .updateTable("workspace")
      .set({ deletedAt: null, updatedAt: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  /**
   * Publish a workspace (enables notifications)
   */
  async publish(id: string, auditContext?: AuditContext): Promise<Workspace | null> {
    const result = await database
      .updateTable("workspace")
      .set({ isPublished: true, updatedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext) {
      await auditLogService.logEvent({
        workspaceId: id,
        eventType: "workspace.published",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: result.name },
      });
    }

    return result ?? null;
  },

  /**
   * Unpublish a workspace (disables notifications)
   */
  async unpublish(id: string, auditContext?: AuditContext): Promise<Workspace | null> {
    const result = await database
      .updateTable("workspace")
      .set({ isPublished: false, updatedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    if (result && auditContext) {
      await auditLogService.logEvent({
        workspaceId: id,
        eventType: "workspace.unpublished",
        actorId: auditContext.actorId,
        source: auditContext.source,
        ipAddress: auditContext.ipAddress,
        metadata: { workspaceName: result.name },
      });
    }

    return result ?? null;
  },
};
