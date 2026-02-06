import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { dependencyService, CircularDependencyError } from "../services/dependency";
import { taskService } from "../services/task";
import { sectionService } from "../services/section";
import { workspaceService } from "../services/workspace";

describe("DependencyService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdDependencyIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdDependencyIds) {
      await database.deleteFrom("task_dependency").where("id", "=", id).execute();
    }
    for (const id of createdTaskIds) {
      await database.deleteFrom("task").where("id", "=", id).execute();
    }
    for (const id of createdSectionIds) {
      await database.deleteFrom("section").where("id", "=", id).execute();
    }
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
  });

  // Helper to create workspace, section, and tasks
  async function createTestTasks(count: number) {
    const workspace = await workspaceService.create({ name: `Dependency Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    const tasks = [];
    for (let i = 0; i < count; i++) {
      const task = await taskService.create({
        sectionId: section.id,
        title: `Task ${i + 1}`,
        position: i,
        type: "FORM",
      });
      createdTaskIds.push(task.id);
      tasks.push(task);
    }

    return { workspace, section, tasks };
  }

  describe("create", () => {
    it("should create an unlock dependency", async () => {
      const { tasks } = await createTestTasks(2);

      const dependency = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      createdDependencyIds.push(dependency.id);

      expect(dependency.id).toBeDefined();
      expect(dependency.taskId).toBe(tasks[1].id);
      expect(dependency.dependsOnTaskId).toBe(tasks[0].id);
      expect(dependency.type).toBe("unlock");
      expect(dependency.offsetDays).toBeNull();
    });

    it("should create a date_anchor dependency with offset", async () => {
      const { tasks } = await createTestTasks(2);

      const dependency = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "date_anchor",
        offsetDays: 7,
      });
      createdDependencyIds.push(dependency.id);

      expect(dependency.type).toBe("date_anchor");
      expect(dependency.offsetDays).toBe(7);
    });

    it("should create a both dependency", async () => {
      const { tasks } = await createTestTasks(2);

      const dependency = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "both",
        offsetDays: 3,
      });
      createdDependencyIds.push(dependency.id);

      expect(dependency.type).toBe("both");
      expect(dependency.offsetDays).toBe(3);
    });
  });

  describe("circular detection", () => {
    it("should reject direct circular dependency (A depends on A)", async () => {
      const { tasks } = await createTestTasks(1);

      await expect(
        dependencyService.create({
          taskId: tasks[0].id,
          dependsOnTaskId: tasks[0].id,
          type: "unlock",
        })
      ).rejects.toThrow(CircularDependencyError);
    });

    it("should reject two-way circular dependency (A→B, B→A)", async () => {
      const { tasks } = await createTestTasks(2);

      // A depends on B (OK)
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      // B depends on A (should fail - creates cycle)
      await expect(
        dependencyService.create({
          taskId: tasks[1].id,
          dependsOnTaskId: tasks[0].id,
          type: "unlock",
        })
      ).rejects.toThrow(CircularDependencyError);
    });

    it("should reject deep circular dependency (A→B→C→A)", async () => {
      const { tasks } = await createTestTasks(3);

      // A depends on B
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      // B depends on C
      const dep2 = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[2].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      // C depends on A (should fail - creates cycle)
      await expect(
        dependencyService.create({
          taskId: tasks[2].id,
          dependsOnTaskId: tasks[0].id,
          type: "unlock",
        })
      ).rejects.toThrow(CircularDependencyError);
    });

    it("should allow valid chain (A→B→C)", async () => {
      const { tasks } = await createTestTasks(3);

      // A depends on B
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      // B depends on C (OK - no cycle)
      const dep2 = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[2].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      expect(dep1.id).toBeDefined();
      expect(dep2.id).toBeDefined();
    });

    it("should allow diamond pattern (A→B, A→C, B→D, C→D)", async () => {
      const { tasks } = await createTestTasks(4);
      const [A, B, C, D] = tasks;

      // A depends on B
      const dep1 = await dependencyService.create({
        taskId: A.id,
        dependsOnTaskId: B.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      // A depends on C
      const dep2 = await dependencyService.create({
        taskId: A.id,
        dependsOnTaskId: C.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      // B depends on D
      const dep3 = await dependencyService.create({
        taskId: B.id,
        dependsOnTaskId: D.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep3.id);

      // C depends on D (OK - diamond, not cycle)
      const dep4 = await dependencyService.create({
        taskId: C.id,
        dependsOnTaskId: D.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep4.id);

      expect(dep4.id).toBeDefined();
    });
  });

  describe("getByTaskId", () => {
    it("should return dependencies for a task", async () => {
      const { tasks } = await createTestTasks(3);

      // Task 0 depends on tasks 1 and 2
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[2].id,
        type: "date_anchor",
        offsetDays: 5,
      });
      createdDependencyIds.push(dep2.id);

      const dependencies = await dependencyService.getByTaskId(tasks[0].id);

      expect(dependencies).toHaveLength(2);
      expect(dependencies.map((d) => d.dependsOnTaskId)).toContain(tasks[1].id);
      expect(dependencies.map((d) => d.dependsOnTaskId)).toContain(tasks[2].id);
    });

    it("should return empty array for task with no dependencies", async () => {
      const { tasks } = await createTestTasks(1);

      const dependencies = await dependencyService.getByTaskId(tasks[0].id);

      expect(dependencies).toEqual([]);
    });
  });

  describe("getDependents", () => {
    it("should return tasks that depend on a given task", async () => {
      const { tasks } = await createTestTasks(3);

      // Tasks 1 and 2 depend on task 0
      const dep1 = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: tasks[2].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      const dependents = await dependencyService.getDependents(tasks[0].id);

      expect(dependents).toHaveLength(2);
      expect(dependents.map((d) => d.taskId)).toContain(tasks[1].id);
      expect(dependents.map((d) => d.taskId)).toContain(tasks[2].id);
    });
  });

  describe("remove", () => {
    it("should remove a dependency", async () => {
      const { tasks } = await createTestTasks(2);

      const dependency = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      // Don't add to cleanup - we're deleting it

      const result = await dependencyService.remove(dependency.id);
      expect(result).toBe(true);

      const dependencies = await dependencyService.getByTaskId(tasks[1].id);
      expect(dependencies).toHaveLength(0);
    });

    it("should return false for non-existent dependency", async () => {
      const result = await dependencyService.remove("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("removeByTasks", () => {
    it("should remove dependency between two specific tasks", async () => {
      const { tasks } = await createTestTasks(2);

      const dependency = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      // Don't add to cleanup

      const result = await dependencyService.removeByTasks(tasks[1].id, tasks[0].id);
      expect(result).toBe(true);

      const dependencies = await dependencyService.getByTaskId(tasks[1].id);
      expect(dependencies).toHaveLength(0);
    });
  });

  describe("getFullChain", () => {
    it("should return full dependency chain", async () => {
      const { tasks } = await createTestTasks(4);

      // A→B→C→D (A depends on B, B depends on C, C depends on D)
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[2].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      const dep3 = await dependencyService.create({
        taskId: tasks[2].id,
        dependsOnTaskId: tasks[3].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep3.id);

      const chain = await dependencyService.getFullChain(tasks[0].id);

      // Chain should include B, C, D (all tasks that A transitively depends on)
      expect(chain).toHaveLength(3);
      expect(chain).toContain(tasks[1].id);
      expect(chain).toContain(tasks[2].id);
      expect(chain).toContain(tasks[3].id);
    });

    it("should return empty array for task with no dependencies", async () => {
      const { tasks } = await createTestTasks(1);

      const chain = await dependencyService.getFullChain(tasks[0].id);

      expect(chain).toEqual([]);
    });
  });

  describe("isTaskUnlocked", () => {
    it("should return true for task with no dependencies", async () => {
      const { tasks } = await createTestTasks(1);

      const unlocked = await dependencyService.isTaskUnlocked(tasks[0].id);

      expect(unlocked).toBe(true);
    });

    it("should return false when unlock dependency is not completed", async () => {
      const { tasks } = await createTestTasks(2);

      // Task 1 depends on Task 0 (unlock type)
      const dep = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      const unlocked = await dependencyService.isTaskUnlocked(tasks[1].id);

      expect(unlocked).toBe(false);
    });

    it("should return true when unlock dependency is completed", async () => {
      const { tasks } = await createTestTasks(2);

      // Task 1 depends on Task 0
      const dep = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Complete Task 0
      await taskService.markComplete(tasks[0].id);

      const unlocked = await dependencyService.isTaskUnlocked(tasks[1].id);

      expect(unlocked).toBe(true);
    });

    it("should return false when ANY unlock dependency is not completed", async () => {
      const { tasks } = await createTestTasks(3);

      // Task 0 depends on Task 1 AND Task 2
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[2].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      // Complete only Task 1
      await taskService.markComplete(tasks[1].id);

      const unlocked = await dependencyService.isTaskUnlocked(tasks[0].id);

      expect(unlocked).toBe(false);
    });

    it("should return true when ALL unlock dependencies are completed", async () => {
      const { tasks } = await createTestTasks(3);

      // Task 0 depends on Task 1 AND Task 2
      const dep1 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[1].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: tasks[0].id,
        dependsOnTaskId: tasks[2].id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      // Complete both Task 1 and Task 2
      await taskService.markComplete(tasks[1].id);
      await taskService.markComplete(tasks[2].id);

      const unlocked = await dependencyService.isTaskUnlocked(tasks[0].id);

      expect(unlocked).toBe(true);
    });

    it("should check 'both' type dependencies for unlock", async () => {
      const { tasks } = await createTestTasks(2);

      // Task 1 depends on Task 0 (both type - unlock AND date_anchor)
      const dep = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "both",
      });
      createdDependencyIds.push(dep.id);

      // Not completed - should be locked
      let unlocked = await dependencyService.isTaskUnlocked(tasks[1].id);
      expect(unlocked).toBe(false);

      // Complete Task 0 - should be unlocked
      await taskService.markComplete(tasks[0].id);
      unlocked = await dependencyService.isTaskUnlocked(tasks[1].id);
      expect(unlocked).toBe(true);
    });

    it("should ignore date_anchor only dependencies for unlock check", async () => {
      const { tasks } = await createTestTasks(2);

      // Task 1 depends on Task 0 (date_anchor type - does NOT block)
      const dep = await dependencyService.create({
        taskId: tasks[1].id,
        dependsOnTaskId: tasks[0].id,
        type: "date_anchor",
        offsetDays: 7,
      });
      createdDependencyIds.push(dep.id);

      // Task 0 is not completed, but date_anchor doesn't block
      const unlocked = await dependencyService.isTaskUnlocked(tasks[1].id);

      expect(unlocked).toBe(true);
    });
  });
});
