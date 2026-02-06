import { database } from "../index";
import type {
  Workspace,
  NewWorkspace,
  WorkspaceUpdate,
  Section,
  Task,
} from "../schemas/main";

// Types for nested workspace structure
export interface WorkspaceWithNested extends Workspace {
  sections: SectionWithTasks[];
}

export interface SectionWithTasks extends Section {
  tasks: Task[];
}

export const workspaceService = {
  /**
   * Create a new workspace
   */
  async create(input: NewWorkspace): Promise<Workspace> {
    return database
      .insertInto("workspace")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
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
   * Update a workspace (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<WorkspaceUpdate, "id" | "createdAt" | "deletedAt">
  ): Promise<Workspace | null> {
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

    return result ?? null;
  },

  /**
   * Soft delete a workspace
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await database
      .updateTable("workspace")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return (result.numUpdatedRows ?? 0n) > 0n;
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
};
