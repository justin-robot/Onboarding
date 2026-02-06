import { database } from "../index";
import type { TaskDependency, NewTaskDependency } from "../schemas/main";

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
};
