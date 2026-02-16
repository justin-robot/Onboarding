import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { dependencyService } from "../services/dependency";
import { cascadeService } from "../services/cascade";

describe("CascadeService", () => {
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

  // Helper to create tasks
  async function createTestTasks(count: number) {
    const workspace = await workspaceService.create({ name: `Cascade Test ${Date.now()}` });
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
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);
      tasks.push(task);
    }

    return { workspace, section, tasks };
  }

  describe("onTaskCompleted", () => {
    it("should set due date on date_anchor dependent task", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      // Create date_anchor dependency with 5 day offset
      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "date_anchor",
        offsetDays: 5,
      });
      createdDependencyIds.push(dep.id);

      // Complete prerequisite
      const completedAt = new Date();
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt })
        .where("id", "=", prereq.id)
        .execute();

      // Trigger cascade
      await cascadeService.onTaskCompleted(prereq.id);

      // Check dependent task due date
      const updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeInstanceOf(Date);

      // Due date should be completedAt + 5 days
      const expectedDue = new Date(completedAt);
      expectedDue.setDate(expectedDue.getDate() + 5);

      // Compare dates (within 1 second tolerance for test timing)
      const actualTime = updatedDependent!.dueDateValue!.getTime();
      const expectedTime = expectedDue.getTime();
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000);
    });

    it("should set due date on 'both' type dependent task", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      // Create 'both' dependency with 3 day offset
      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "both",
        offsetDays: 3,
      });
      createdDependencyIds.push(dep.id);

      // Complete prerequisite
      const completedAt = new Date();
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt })
        .where("id", "=", prereq.id)
        .execute();

      // Trigger cascade
      await cascadeService.onTaskCompleted(prereq.id);

      // Check dependent task due date
      const updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeInstanceOf(Date);
    });

    it("should NOT set due date on unlock-only dependent task", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      // Create unlock-only dependency
      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Complete prerequisite
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", prereq.id)
        .execute();

      // Trigger cascade
      await cascadeService.onTaskCompleted(prereq.id);

      // Due date should remain null
      const updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeNull();
    });

    it("should cascade through multiple levels", async () => {
      const { tasks } = await createTestTasks(3);
      const [task1, task2, task3] = tasks;

      // Chain: task1 -> task2 (3 days) -> task3 (2 days)
      const dep1 = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "date_anchor",
        offsetDays: 3,
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: task3.id,
        dependsOnTaskId: task2.id,
        type: "date_anchor",
        offsetDays: 2,
      });
      createdDependencyIds.push(dep2.id);

      // Complete task1
      const completedAt = new Date();
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt })
        .where("id", "=", task1.id)
        .execute();

      await cascadeService.onTaskCompleted(task1.id);

      // task2 should have due date = completedAt + 3 days
      const updatedTask2 = await taskService.getById(task2.id);
      expect(updatedTask2?.dueDateValue).toBeInstanceOf(Date);

      // Complete task2
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: updatedTask2!.dueDateValue })
        .where("id", "=", task2.id)
        .execute();

      await cascadeService.onTaskCompleted(task2.id);

      // task3 should have due date = task2.dueDateValue + 2 days
      const updatedTask3 = await taskService.getById(task3.id);
      expect(updatedTask3?.dueDateValue).toBeInstanceOf(Date);
    });

    it("should handle zero offset days", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "date_anchor",
        offsetDays: 0,
      });
      createdDependencyIds.push(dep.id);

      const completedAt = new Date();
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt })
        .where("id", "=", prereq.id)
        .execute();

      await cascadeService.onTaskCompleted(prereq.id);

      const updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeInstanceOf(Date);

      // Due date should be same as completedAt
      const actualTime = updatedDependent!.dueDateValue!.getTime();
      const expectedTime = completedAt.getTime();
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000);
    });
  });

  describe("onTaskReopened", () => {
    it("should null out due dates of date_anchor dependents", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "date_anchor",
        offsetDays: 5,
      });
      createdDependencyIds.push(dep.id);

      // Set up: complete prerequisite and cascade
      const completedAt = new Date();
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt })
        .where("id", "=", prereq.id)
        .execute();
      await cascadeService.onTaskCompleted(prereq.id);

      // Verify due date was set
      let updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeInstanceOf(Date);

      // Reopen prerequisite
      await database
        .updateTable("task")
        .set({ status: "not_started", completedAt: null })
        .where("id", "=", prereq.id)
        .execute();

      await cascadeService.onTaskReopened(prereq.id);

      // Due date should be nulled
      updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeNull();
    });

    it("should cascade null through multiple levels", async () => {
      const { tasks } = await createTestTasks(3);
      const [task1, task2, task3] = tasks;

      // Chain: task1 -> task2 -> task3
      const dep1 = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "date_anchor",
        offsetDays: 3,
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: task3.id,
        dependsOnTaskId: task2.id,
        type: "date_anchor",
        offsetDays: 2,
      });
      createdDependencyIds.push(dep2.id);

      // Set up: complete task1 and task2, cascade due dates
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task1.id)
        .execute();
      await cascadeService.onTaskCompleted(task1.id);

      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task2.id)
        .execute();
      await cascadeService.onTaskCompleted(task2.id);

      // Verify due dates are set
      let updatedTask2 = await taskService.getById(task2.id);
      let updatedTask3 = await taskService.getById(task3.id);
      expect(updatedTask2?.dueDateValue).toBeInstanceOf(Date);
      expect(updatedTask3?.dueDateValue).toBeInstanceOf(Date);

      // Reopen task1
      await database
        .updateTable("task")
        .set({ status: "not_started", completedAt: null })
        .where("id", "=", task1.id)
        .execute();

      await cascadeService.onTaskReopened(task1.id);

      // Both task2 and task3 should have null due dates
      updatedTask2 = await taskService.getById(task2.id);
      updatedTask3 = await taskService.getById(task3.id);
      expect(updatedTask2?.dueDateValue).toBeNull();
      expect(updatedTask3?.dueDateValue).toBeNull();
    });
  });

  describe("onTaskDeleted", () => {
    it("should null out due dates and remove dependencies", async () => {
      const { tasks } = await createTestTasks(2);
      const [prereq, dependent] = tasks;

      const dep = await dependencyService.create({
        taskId: dependent.id,
        dependsOnTaskId: prereq.id,
        type: "date_anchor",
        offsetDays: 5,
      });
      createdDependencyIds.push(dep.id);

      // Set up: complete prerequisite and cascade
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", prereq.id)
        .execute();
      await cascadeService.onTaskCompleted(prereq.id);

      // Verify due date was set
      let updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeInstanceOf(Date);

      // Delete prerequisite
      await cascadeService.onTaskDeleted(prereq.id);

      // Due date should be nulled
      updatedDependent = await taskService.getById(dependent.id);
      expect(updatedDependent?.dueDateValue).toBeNull();

      // Dependency should be removed
      const deps = await dependencyService.getByTaskId(dependent.id);
      expect(deps).toHaveLength(0);

      // Remove from cleanup list since it was deleted
      const idx = createdDependencyIds.indexOf(dep.id);
      if (idx > -1) createdDependencyIds.splice(idx, 1);
    });

    it("should cascade through dependency chain on delete", async () => {
      const { tasks } = await createTestTasks(3);
      const [task1, task2, task3] = tasks;

      // Chain: task1 -> task2 -> task3
      const dep1 = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "date_anchor",
        offsetDays: 3,
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: task3.id,
        dependsOnTaskId: task2.id,
        type: "date_anchor",
        offsetDays: 2,
      });
      createdDependencyIds.push(dep2.id);

      // Set up due dates
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task1.id)
        .execute();
      await cascadeService.onTaskCompleted(task1.id);

      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task2.id)
        .execute();
      await cascadeService.onTaskCompleted(task2.id);

      // Verify due dates are set
      let updatedTask2 = await taskService.getById(task2.id);
      let updatedTask3 = await taskService.getById(task3.id);
      expect(updatedTask2?.dueDateValue).toBeInstanceOf(Date);
      expect(updatedTask3?.dueDateValue).toBeInstanceOf(Date);

      // Delete task1
      await cascadeService.onTaskDeleted(task1.id);

      // task2's due date should be nulled, dependency removed
      updatedTask2 = await taskService.getById(task2.id);
      expect(updatedTask2?.dueDateValue).toBeNull();

      // task3's due date should also be nulled (cascade)
      updatedTask3 = await taskService.getById(task3.id);
      expect(updatedTask3?.dueDateValue).toBeNull();

      // Remove dep1 from cleanup list
      const idx = createdDependencyIds.indexOf(dep1.id);
      if (idx > -1) createdDependencyIds.splice(idx, 1);
    });
  });
});
