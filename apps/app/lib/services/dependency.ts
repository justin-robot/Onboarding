import { database } from "@repo/database";
import type { TaskDependency, NewTaskDependency } from "@repo/database";

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends Error {
  constructor(taskId: string, dependsOnTaskId: string) {
    super(
      `Circular dependency detected: adding dependency from ${taskId} to ${dependsOnTaskId} would create a cycle`
    );
    this.name = "CircularDependencyError";
  }
}

export const dependencyService = {
  /**
   * Create a new dependency with circular detection
   */
  async create(input: NewTaskDependency): Promise<TaskDependency> {
    // Check for self-dependency
    if (input.taskId === input.dependsOnTaskId) {
      throw new CircularDependencyError(input.taskId, input.dependsOnTaskId);
    }

    // Check for circular dependency
    // Get the full chain of what dependsOnTaskId depends on
    // If taskId appears in that chain, we'd have a cycle
    const chain = await this.getFullChain(input.dependsOnTaskId);
    if (chain.includes(input.taskId)) {
      throw new CircularDependencyError(input.taskId, input.dependsOnTaskId);
    }

    return database
      .insertInto("task_dependency")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get all dependencies for a task (what this task depends on)
   */
  async getByTaskId(taskId: string): Promise<TaskDependency[]> {
    return database
      .selectFrom("task_dependency")
      .selectAll()
      .where("taskId", "=", taskId)
      .execute();
  },

  /**
   * Get all tasks that depend on a given task (dependents)
   */
  async getDependents(dependsOnTaskId: string): Promise<TaskDependency[]> {
    return database
      .selectFrom("task_dependency")
      .selectAll()
      .where("dependsOnTaskId", "=", dependsOnTaskId)
      .execute();
  },

  /**
   * Remove a dependency by ID
   */
  async remove(id: string): Promise<boolean> {
    const result = await database
      .deleteFrom("task_dependency")
      .where("id", "=", id)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Remove a dependency between two specific tasks
   */
  async removeByTasks(taskId: string, dependsOnTaskId: string): Promise<boolean> {
    const result = await database
      .deleteFrom("task_dependency")
      .where("taskId", "=", taskId)
      .where("dependsOnTaskId", "=", dependsOnTaskId)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Get the full dependency chain for a task (all transitive dependencies)
   * Uses recursive traversal to find all tasks in the chain
   */
  async getFullChain(taskId: string): Promise<string[]> {
    const visited = new Set<string>();
    const chain: string[] = [];

    async function traverse(currentTaskId: string) {
      // Get direct dependencies
      const dependencies = await database
        .selectFrom("task_dependency")
        .select(["dependsOnTaskId"])
        .where("taskId", "=", currentTaskId)
        .execute();

      for (const dep of dependencies) {
        if (!visited.has(dep.dependsOnTaskId)) {
          visited.add(dep.dependsOnTaskId);
          chain.push(dep.dependsOnTaskId);
          await traverse(dep.dependsOnTaskId);
        }
      }
    }

    await traverse(taskId);
    return chain;
  },

  /**
   * Check if a task is unlocked (all unlock/both dependencies are completed)
   * Returns true if task can be worked on, false if blocked
   */
  async isTaskUnlocked(taskId: string): Promise<boolean> {
    const hasBlocking = await this.hasBlockingDependencies(taskId);
    return !hasBlocking;
  },

  /**
   * Check if a task has any blocking (unlock) dependencies that are not complete
   */
  async hasBlockingDependencies(taskId: string): Promise<boolean> {
    const dependencies = await database
      .selectFrom("task_dependency")
      .innerJoin("task", "task.id", "task_dependency.dependsOnTaskId")
      .select(["task_dependency.id"])
      .where("task_dependency.taskId", "=", taskId)
      .where("task_dependency.type", "in", ["unlock", "both"])
      .where("task.status", "!=", "completed")
      .where("task.deletedAt", "is", null)
      .execute();

    return dependencies.length > 0;
  },

  /**
   * Get all dependencies for a task with their prerequisite task details
   */
  async getDependenciesWithDetails(taskId: string): Promise<
    Array<{
      id: string;
      dependsOnTaskId: string;
      type: string;
      offsetDays: number | null;
      task: { id: string; title: string; status: string; sectionTitle: string };
    }>
  > {
    const results = await database
      .selectFrom("task_dependency")
      .innerJoin("task", "task.id", "task_dependency.dependsOnTaskId")
      .innerJoin("section", "section.id", "task.sectionId")
      .select([
        "task_dependency.id",
        "task_dependency.dependsOnTaskId",
        "task_dependency.type",
        "task_dependency.offsetDays",
        "task.id as taskId",
        "task.title as taskTitle",
        "task.status as taskStatus",
        "section.title as sectionTitle",
      ])
      .where("task_dependency.taskId", "=", taskId)
      .where("task.deletedAt", "is", null)
      .execute();

    return results.map((r) => ({
      id: r.id,
      dependsOnTaskId: r.dependsOnTaskId,
      type: r.type,
      offsetDays: r.offsetDays,
      task: {
        id: r.taskId,
        title: r.taskTitle,
        status: r.taskStatus,
        sectionTitle: r.sectionTitle,
      },
    }));
  },

  /**
   * Get all blocking dependencies with their task details
   */
  async getBlockingDependencies(taskId: string): Promise<
    Array<{
      dependency: TaskDependency;
      blockedByTask: { id: string; title: string; status: string };
    }>
  > {
    const results = await database
      .selectFrom("task_dependency")
      .innerJoin("task", "task.id", "task_dependency.dependsOnTaskId")
      .select([
        "task_dependency.id",
        "task_dependency.taskId",
        "task_dependency.dependsOnTaskId",
        "task_dependency.type",
        "task_dependency.offsetDays",
        "task_dependency.createdAt",
        "task.id as blockedTaskId",
        "task.title as blockedTaskTitle",
        "task.status as blockedTaskStatus",
      ])
      .where("task_dependency.taskId", "=", taskId)
      .where("task_dependency.type", "in", ["unlock", "both"])
      .where("task.status", "!=", "completed")
      .where("task.deletedAt", "is", null)
      .execute();

    return results.map((r) => ({
      dependency: {
        id: r.id,
        taskId: r.taskId,
        dependsOnTaskId: r.dependsOnTaskId,
        type: r.type,
        offsetDays: r.offsetDays,
        createdAt: r.createdAt,
      },
      blockedByTask: {
        id: r.blockedTaskId,
        title: r.blockedTaskTitle,
        status: r.blockedTaskStatus,
      },
    }));
  },

  /**
   * Get the date anchor dependency for a task (if any)
   * Returns the dependency and the anchor task info
   */
  async getDateAnchorDependency(taskId: string): Promise<{
    dependency: TaskDependency;
    anchorTask: { id: string; title: string; status: string };
  } | null> {
    const result = await database
      .selectFrom("task_dependency")
      .innerJoin("task", "task.id", "task_dependency.dependsOnTaskId")
      .select([
        "task_dependency.id",
        "task_dependency.taskId",
        "task_dependency.dependsOnTaskId",
        "task_dependency.type",
        "task_dependency.offsetDays",
        "task_dependency.createdAt",
        "task.id as anchorTaskId",
        "task.title as anchorTaskTitle",
        "task.status as anchorTaskStatus",
      ])
      .where("task_dependency.taskId", "=", taskId)
      .where("task_dependency.type", "in", ["date_anchor", "both"])
      .where("task.deletedAt", "is", null)
      .executeTakeFirst();

    if (!result) return null;

    return {
      dependency: {
        id: result.id,
        taskId: result.taskId,
        dependsOnTaskId: result.dependsOnTaskId,
        type: result.type,
        offsetDays: result.offsetDays,
        createdAt: result.createdAt,
      },
      anchorTask: {
        id: result.anchorTaskId,
        title: result.anchorTaskTitle,
        status: result.anchorTaskStatus,
      },
    };
  },

  /**
   * Set or update the date anchor dependency for a task
   * This creates a date_anchor dependency with the specified offset
   * If the task already has a date_anchor/both dependency, it will be replaced
   */
  async setDateAnchorDependency(
    taskId: string,
    anchorTaskId: string,
    offsetDays: number
  ): Promise<TaskDependency> {
    // Check for self-dependency
    if (taskId === anchorTaskId) {
      throw new CircularDependencyError(taskId, anchorTaskId);
    }

    // Check for circular dependency
    const chain = await this.getFullChain(anchorTaskId);
    if (chain.includes(taskId)) {
      throw new CircularDependencyError(taskId, anchorTaskId);
    }

    // Remove any existing date_anchor or both dependencies for this task
    await database
      .deleteFrom("task_dependency")
      .where("taskId", "=", taskId)
      .where("type", "in", ["date_anchor", "both"])
      .execute();

    // Create the new dependency
    const dependency = await database
      .insertInto("task_dependency")
      .values({
        taskId,
        dependsOnTaskId: anchorTaskId,
        type: "date_anchor",
        offsetDays,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Clear any existing absolute due date since we're now using relative
    await database
      .updateTable("task")
      .set({
        dueDateValue: null,
        dueDateType: "relative",
        updatedAt: new Date(),
      })
      .where("id", "=", taskId)
      .execute();

    return dependency;
  },

  /**
   * Remove the date anchor dependency for a task
   * This converts the task back to using an absolute due date (or no due date)
   */
  async removeDateAnchorDependency(taskId: string): Promise<boolean> {
    const result = await database
      .deleteFrom("task_dependency")
      .where("taskId", "=", taskId)
      .where("type", "in", ["date_anchor", "both"])
      .executeTakeFirst();

    // Update the task to use absolute due date type
    await database
      .updateTable("task")
      .set({
        dueDateType: "absolute",
        updatedAt: new Date(),
      })
      .where("id", "=", taskId)
      .execute();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Get all tasks in the same workspace that can be used as date anchors
   * Excludes the task itself and any tasks that would create a circular dependency
   */
  async getAvailableAnchorTasks(
    taskId: string
  ): Promise<Array<{ id: string; title: string; sectionTitle: string }>> {
    // Get the task's workspace ID
    const task = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["section.workspaceId"])
      .where("task.id", "=", taskId)
      .executeTakeFirst();

    if (!task) return [];

    // Get tasks that would create a circular dependency (tasks that depend on this one)
    const wouldCreateCycle = await this.getDependentsRecursive(taskId);
    const excludeIds = new Set([taskId, ...wouldCreateCycle]);

    // Get all tasks in the workspace
    const tasks = await database
      .selectFrom("task")
      .innerJoin("section", "section.id", "task.sectionId")
      .select(["task.id", "task.title", "section.title as sectionTitle"])
      .where("section.workspaceId", "=", task.workspaceId)
      .where("task.deletedAt", "is", null)
      .orderBy("section.position")
      .orderBy("task.position")
      .execute();

    return tasks.filter((t) => !excludeIds.has(t.id));
  },

  /**
   * Get all tasks that depend on a task (recursively)
   */
  async getDependentsRecursive(taskId: string): Promise<string[]> {
    const visited = new Set<string>();
    const dependents: string[] = [];

    async function traverse(currentTaskId: string) {
      const deps = await database
        .selectFrom("task_dependency")
        .select(["taskId"])
        .where("dependsOnTaskId", "=", currentTaskId)
        .execute();

      for (const dep of deps) {
        if (!visited.has(dep.taskId)) {
          visited.add(dep.taskId);
          dependents.push(dep.taskId);
          await traverse(dep.taskId);
        }
      }
    }

    await traverse(taskId);
    return dependents;
  },
};
