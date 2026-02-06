import { database } from "../index";
import type { Task, NewTask, TaskUpdate } from "../schemas/main";

export const taskService = {
  /**
   * Create a new task
   */
  async create(input: NewTask): Promise<Task> {
    return database
      .insertInto("task")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get a task by ID (excludes soft-deleted)
   */
  async getById(id: string): Promise<Task | null> {
    const task = await database
      .selectFrom("task")
      .selectAll()
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return task ?? null;
  },

  /**
   * Get all tasks for a section, ordered by position
   */
  async getBySectionId(sectionId: string): Promise<Task[]> {
    return database
      .selectFrom("task")
      .selectAll()
      .where("sectionId", "=", sectionId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();
  },

  /**
   * Update a task (excludes soft-deleted)
   */
  async update(
    id: string,
    input: Omit<TaskUpdate, "id" | "sectionId" | "createdAt" | "deletedAt">
  ): Promise<Task | null> {
    const result = await database
      .updateTable("task")
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
   * Soft delete a task
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await database
      .updateTable("task")
      .set({ deletedAt: new Date() })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .executeTakeFirst();

    return (result.numUpdatedRows ?? 0n) > 0n;
  },

  /**
   * Reorder tasks within a section by array of IDs
   */
  async reorder(sectionId: string, taskIds: string[]): Promise<void> {
    for (let i = 0; i < taskIds.length; i++) {
      await database
        .updateTable("task")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", taskIds[i])
        .where("sectionId", "=", sectionId)
        .where("deletedAt", "is", null)
        .execute();
    }
  },

  /**
   * Move a task to a different section at a specific position
   * Updates positions in both source and target sections
   */
  async moveToSection(
    taskId: string,
    targetSectionId: string,
    targetPosition: number
  ): Promise<Task | null> {
    // Get the task to find source section
    const task = await this.getById(taskId);
    if (!task) {
      return null;
    }

    const sourceSectionId = task.sectionId;

    // Shift down tasks in target section at and after target position
    await database
      .updateTable("task")
      .set((eb) => ({
        position: eb("position", "+", 1),
        updatedAt: new Date(),
      }))
      .where("sectionId", "=", targetSectionId)
      .where("position", ">=", targetPosition)
      .where("deletedAt", "is", null)
      .execute();

    // Move the task to target section at target position
    const movedTask = await database
      .updateTable("task")
      .set({
        sectionId: targetSectionId,
        position: targetPosition,
        updatedAt: new Date(),
      })
      .where("id", "=", taskId)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    // Recompact positions in source section (close the gap)
    const sourceTasks = await database
      .selectFrom("task")
      .select(["id"])
      .where("sectionId", "=", sourceSectionId)
      .where("deletedAt", "is", null)
      .orderBy("position", "asc")
      .execute();

    for (let i = 0; i < sourceTasks.length; i++) {
      await database
        .updateTable("task")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", sourceTasks[i].id)
        .execute();
    }

    return movedTask ?? null;
  },

  /**
   * Mark a task as completed
   */
  async markComplete(id: string): Promise<Task | null> {
    const result = await database
      .updateTable("task")
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  /**
   * Mark a task as incomplete (revert to not_started)
   */
  async markIncomplete(id: string): Promise<Task | null> {
    const result = await database
      .updateTable("task")
      .set({
        status: "not_started",
        completedAt: null,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .where("deletedAt", "is", null)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },
};
