import { database } from "../index";
import { taskService, type TaskWithLockStatus } from "./task";
import type {
  Section,
  NewSection,
  SectionUpdate,
  Task,
} from "../schemas/main";

// Types for nested section structure
export interface SectionWithTasks extends Section {
  tasks: Task[];
}

export interface SectionWithTasksAndLockStatus extends Section {
  tasks: TaskWithLockStatus[];
}

export interface SectionProgress {
  total: number;
  completed: number;
  percentage: number;
}

export const sectionService = {
  /**
   * Create a new section
   */
  async create(input: NewSection): Promise<Section> {
    return database
      .insertInto("section")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get a section by ID (excludes soft-deleted)
   */
  async getById(id: string): Promise<Section | null> {
    const section = await database
      .selectFrom("section")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return section ?? null;
  },

  /**
   * Get all sections for a workspace, ordered by position
   */
  async getByWorkspaceId(workspaceId: string): Promise<Section[]> {
    return database
      .selectFrom("section")
      .selectAll()
      .where("workspaceId", "=", workspaceId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();
  },

  /**
   * Get a section with nested tasks
   */
  async getByIdWithTasks(id: string): Promise<SectionWithTasks | null> {
    const section = await this.getById(id);
    if (!section) {
      return null;
    }

    const tasks = await database
      .selectFrom("task")
      .selectAll()
      .where("sectionId", "=", id)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    return {
      ...section,
      tasks,
    };
  },

  /**
   * Get a section with nested tasks including lock status
   */
  async getByIdWithTasksAndLockStatus(id: string): Promise<SectionWithTasksAndLockStatus | null> {
    const section = await this.getById(id);
    if (!section) {
      return null;
    }

    const tasks = await taskService.getBySectionIdWithLockStatus(id);

    return {
      ...section,
      tasks,
    };
  },

  /**
   * Update a section (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<SectionUpdate, "id" | "workspaceId" | "createdAt" | "deletedAt">
  ): Promise<Section | null> {
    const result = await database
      .updateTable("section")
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
   * Soft delete a section
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await database
      .updateTable("section")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return (result.numUpdatedRows ?? 0n) > 0n;
  },

  /**
   * Reorder sections by array of IDs
   * Updates positions sequentially (Neon serverless doesn't support transactions)
   */
  async reorder(workspaceId: string, sectionIds: string[]): Promise<void> {
    for (let i = 0; i < sectionIds.length; i++) {
      await database
        .updateTable("section")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", sectionIds[i])
        .where("workspaceId", "=", workspaceId)
        .where("deletedAt", "is", null)
        .execute();
    }
  },

  /**
   * Get progress for a section (computed from task completion)
   */
  async getProgress(sectionId: string): Promise<SectionProgress> {
    const tasks = await database
      .selectFrom("task")
      .select(["status"])
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .execute();

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const percentage = total === 0 ? 0 : (completed / total) * 100;

    return {
      total,
      completed,
      percentage: Math.round(percentage * 100) / 100,
    };
  },
};
