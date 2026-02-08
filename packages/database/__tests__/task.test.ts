import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { taskService } from "../services/task";
import { sectionService } from "../services/section";
import { workspaceService } from "../services/workspace";
import { dependencyService } from "../services/dependency";
import { configService } from "../services/config";
import type { NewTask } from "../schemas/main";

describe("TaskService", () => {
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

  // Helper to create workspace and section
  async function createWorkspaceAndSection(name: string) {
    const workspace = await workspaceService.create({ name });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    return { workspace, section };
  }

  describe("create", () => {
    it("should create a task with type FORM", async () => {
      const { section } = await createWorkspaceAndSection("Create Task Workspace");

      const input: NewTask = {
        sectionId: section.id,
        title: "Test Task",
        position: 0,
        type: "FORM",
      };

      const task = await taskService.create(input);
      createdTaskIds.push(task.id);

      expect(task.id).toBeDefined();
      expect(task.sectionId).toBe(section.id);
      expect(task.title).toBe("Test Task");
      expect(task.type).toBe("FORM");
      expect(task.position).toBe(0);
      expect(task.status).toBe("not_started");
      expect(task.completionRule).toBe("all");
      expect(task.deletedAt).toBeNull();
    });

    it("should create tasks with different types", async () => {
      const { section } = await createWorkspaceAndSection("Task Types Workspace");

      const types = ["FORM", "ACKNOWLEDGEMENT", "TIME_BOOKING", "E_SIGN", "FILE_REQUEST", "APPROVAL"] as const;

      for (let i = 0; i < types.length; i++) {
        const task = await taskService.create({
          sectionId: section.id,
          title: `Task ${types[i]}`,
          position: i,
          type: types[i],
        });
        createdTaskIds.push(task.id);

        expect(task.type).toBe(types[i]);
      }
    });

    it("should create a task with description", async () => {
      const { section } = await createWorkspaceAndSection("Description Workspace");

      const task = await taskService.create({
        sectionId: section.id,
        title: "Task with Description",
        description: "This is a detailed description",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      expect(task.description).toBe("This is a detailed description");
    });

    it("should create a task with due date", async () => {
      const { section } = await createWorkspaceAndSection("Due Date Workspace");

      const dueDate = new Date("2026-12-31");
      const task = await taskService.create({
        sectionId: section.id,
        title: "Task with Due Date",
        position: 0,
        type: "FORM",
        dueDateType: "absolute",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      expect(task.dueDateType).toBe("absolute");
      expect(task.dueDateValue).toEqual(dueDate);
    });
  });

  describe("getById", () => {
    it("should return a task by ID", async () => {
      const { section } = await createWorkspaceAndSection("GetById Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "Get By ID Test",
        position: 0,
        type: "APPROVAL",
      });
      createdTaskIds.push(created.id);

      const task = await taskService.getById(created.id);

      expect(task).toBeDefined();
      expect(task!.id).toBe(created.id);
      expect(task!.title).toBe("Get By ID Test");
    });

    it("should return null for non-existent task", async () => {
      const task = await taskService.getById("non-existent-id");
      expect(task).toBeNull();
    });

    it("should not return soft-deleted tasks", async () => {
      const { section } = await createWorkspaceAndSection("Soft Delete Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "To Be Deleted",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      await taskService.softDelete(created.id);

      const task = await taskService.getById(created.id);
      expect(task).toBeNull();
    });
  });

  describe("getBySectionId", () => {
    it("should return tasks ordered by position", async () => {
      const { section } = await createWorkspaceAndSection("Ordered Tasks Workspace");

      // Create out of order
      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Second",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "First",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task3 = await taskService.create({
        sectionId: section.id,
        title: "Third",
        position: 2,
        type: "FORM",
      });
      createdTaskIds.push(task3.id);

      const tasks = await taskService.getBySectionId(section.id);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe("First");
      expect(tasks[1].title).toBe("Second");
      expect(tasks[2].title).toBe("Third");
    });

    it("should not include soft-deleted tasks", async () => {
      const { section } = await createWorkspaceAndSection("Exclude Deleted Workspace");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Active",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Deleted",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      await taskService.softDelete(task2.id);

      const tasks = await taskService.getBySectionId(section.id);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Active");
    });
  });

  describe("update", () => {
    it("should update task title", async () => {
      const { section } = await createWorkspaceAndSection("Update Title Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "Original Title",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      const updated = await taskService.update(created.id, {
        title: "Updated Title",
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe("Updated Title");
    });

    it("should update task status", async () => {
      const { section } = await createWorkspaceAndSection("Update Status Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "Status Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      const updated = await taskService.update(created.id, {
        status: "completed",
      });

      expect(updated!.status).toBe("completed");
    });

    it("should update completion rule", async () => {
      const { section } = await createWorkspaceAndSection("Completion Rule Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "Completion Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      const updated = await taskService.update(created.id, {
        completionRule: "all",
      });

      expect(updated!.completionRule).toBe("all");
    });

    it("should return null when updating non-existent task", async () => {
      const updated = await taskService.update("non-existent-id", {
        title: "New Title",
      });

      expect(updated).toBeNull();
    });

    it("should not update soft-deleted task", async () => {
      const { section } = await createWorkspaceAndSection("Update Deleted Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "To Delete",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      await taskService.softDelete(created.id);

      const updated = await taskService.update(created.id, {
        title: "Should Not Work",
      });

      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a task", async () => {
      const { section } = await createWorkspaceAndSection("Soft Delete Task Workspace");

      const created = await taskService.create({
        sectionId: section.id,
        title: "To Soft Delete",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(created.id);

      const result = await taskService.softDelete(created.id);

      expect(result).toBe(true);

      // Verify it's soft deleted
      const task = await taskService.getById(created.id);
      expect(task).toBeNull();

      // Verify record still exists
      const raw = await database
        .selectFrom("task")
        .selectAll()
        .where("id", "=", created.id)
        .executeTakeFirst();
      expect(raw).toBeDefined();
      expect(raw!.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent task", async () => {
      const result = await taskService.softDelete("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("reorder", () => {
    it("should reorder tasks within a section", async () => {
      const { section } = await createWorkspaceAndSection("Reorder Workspace");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "A",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "B",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const task3 = await taskService.create({
        sectionId: section.id,
        title: "C",
        position: 2,
        type: "FORM",
      });
      createdTaskIds.push(task3.id);

      // Reorder: C, A, B
      await taskService.reorder(section.id, [task3.id, task1.id, task2.id]);

      const tasks = await taskService.getBySectionId(section.id);

      expect(tasks[0].title).toBe("C");
      expect(tasks[0].position).toBe(0);
      expect(tasks[1].title).toBe("A");
      expect(tasks[1].position).toBe(1);
      expect(tasks[2].title).toBe("B");
      expect(tasks[2].position).toBe(2);
    });
  });

  describe("moveToSection", () => {
    it("should move a task to a different section", async () => {
      const { workspace, section: section1 } = await createWorkspaceAndSection("Move Task Workspace");

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Target Section",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      const task = await taskService.create({
        sectionId: section1.id,
        title: "Moving Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      await taskService.moveToSection(task.id, section2.id, 0);

      const movedTask = await taskService.getById(task.id);
      expect(movedTask!.sectionId).toBe(section2.id);
      expect(movedTask!.position).toBe(0);
    });

    it("should update positions in source section after move", async () => {
      const { workspace, section: section1 } = await createWorkspaceAndSection("Source Positions Workspace");

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Target Section",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      const task1 = await taskService.create({
        sectionId: section1.id,
        title: "First",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section1.id,
        title: "Second",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const task3 = await taskService.create({
        sectionId: section1.id,
        title: "Third",
        position: 2,
        type: "FORM",
      });
      createdTaskIds.push(task3.id);

      // Move task2 (middle) to section2
      await taskService.moveToSection(task2.id, section2.id, 0);

      // Check source section: task1 and task3 should remain, with updated positions
      const sourceTasks = await taskService.getBySectionId(section1.id);
      expect(sourceTasks).toHaveLength(2);
      expect(sourceTasks[0].title).toBe("First");
      expect(sourceTasks[0].position).toBe(0);
      expect(sourceTasks[1].title).toBe("Third");
      expect(sourceTasks[1].position).toBe(1);
    });

    it("should insert at correct position in target section", async () => {
      const { workspace, section: section1 } = await createWorkspaceAndSection("Target Positions Workspace");

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Target Section",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      // Create existing task in target section
      const existingTask = await taskService.create({
        sectionId: section2.id,
        title: "Existing",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(existingTask.id);

      // Create task to move
      const movingTask = await taskService.create({
        sectionId: section1.id,
        title: "Moving",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(movingTask.id);

      // Move to position 0 in target (before existing)
      await taskService.moveToSection(movingTask.id, section2.id, 0);

      const targetTasks = await taskService.getBySectionId(section2.id);
      expect(targetTasks).toHaveLength(2);
      expect(targetTasks[0].title).toBe("Moving");
      expect(targetTasks[0].position).toBe(0);
      expect(targetTasks[1].title).toBe("Existing");
      expect(targetTasks[1].position).toBe(1);
    });
  });

  describe("markComplete", () => {
    it("should mark a task as completed", async () => {
      const { section } = await createWorkspaceAndSection("Complete Workspace");

      const task = await taskService.create({
        sectionId: section.id,
        title: "To Complete",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      const completed = await taskService.markComplete(task.id);

      expect(completed!.status).toBe("completed");
      expect(completed!.completedAt).toBeInstanceOf(Date);
    });

    it("should return null for non-existent task", async () => {
      const result = await taskService.markComplete("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("markIncomplete", () => {
    it("should mark a completed task as not started", async () => {
      const { section } = await createWorkspaceAndSection("Incomplete Workspace");

      const task = await taskService.create({
        sectionId: section.id,
        title: "Completed Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      await taskService.markComplete(task.id);
      const incomplete = await taskService.markIncomplete(task.id);

      expect(incomplete!.status).toBe("not_started");
      expect(incomplete!.completedAt).toBeNull();
    });
  });

  describe("getByIdWithLockStatus", () => {
    it("should return task with locked: false when no dependencies", async () => {
      const { section } = await createWorkspaceAndSection("Lock Status Workspace");

      const task = await taskService.create({
        sectionId: section.id,
        title: "No Dependencies",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      const result = await taskService.getByIdWithLockStatus(task.id);

      expect(result).toBeDefined();
      expect(result!.locked).toBe(false);
    });

    it("should return task with locked: true when dependency not completed", async () => {
      const { section } = await createWorkspaceAndSection("Locked Task Workspace");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Prerequisite",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Dependent Task",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      const result = await taskService.getByIdWithLockStatus(task2.id);

      expect(result!.locked).toBe(true);
    });

    it("should return task with locked: false when dependency is completed", async () => {
      const { section } = await createWorkspaceAndSection("Unlocked Task Workspace");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Prerequisite",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Dependent Task",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Complete the prerequisite
      await taskService.markComplete(task1.id);

      const result = await taskService.getByIdWithLockStatus(task2.id);

      expect(result!.locked).toBe(false);
    });

    it("should return null for non-existent task", async () => {
      const result = await taskService.getByIdWithLockStatus("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("getBySectionIdWithLockStatus", () => {
    it("should return tasks with lock status", async () => {
      const { section } = await createWorkspaceAndSection("Section Lock Status");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "First Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Second Task",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      // Task 2 depends on Task 1
      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      const tasks = await taskService.getBySectionIdWithLockStatus(section.id);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe("First Task");
      expect(tasks[0].locked).toBe(false);
      expect(tasks[1].title).toBe("Second Task");
      expect(tasks[1].locked).toBe(true);
    });

    it("should update lock status after completing prerequisite", async () => {
      const { section } = await createWorkspaceAndSection("Dynamic Lock Status");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Prerequisite",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Dependent",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Before completing - task2 is locked
      let tasks = await taskService.getBySectionIdWithLockStatus(section.id);
      expect(tasks[1].locked).toBe(true);

      // Complete task1
      await taskService.markComplete(task1.id);

      // After completing - task2 is unlocked
      tasks = await taskService.getBySectionIdWithLockStatus(section.id);
      expect(tasks[1].locked).toBe(false);
    });
  });

  describe("getByIdWithConfig", () => {
    it("should return FORM task with form config", async () => {
      const { section } = await createWorkspaceAndSection("Config Loading FORM");

      const task = await taskService.create({
        sectionId: section.id,
        title: "Form Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      // Create config for the task
      await configService.createFormConfig(task.id);

      const result = await taskService.getByIdWithConfig(task.id);

      expect(result).toBeDefined();
      expect(result!.type).toBe("FORM");
      expect(result!.config).toBeDefined();
      expect(result!.config!.taskId).toBe(task.id);
    });

    it("should return ACKNOWLEDGEMENT task with acknowledgement config", async () => {
      const { section } = await createWorkspaceAndSection("Config Loading ACK");

      const task = await taskService.create({
        sectionId: section.id,
        title: "Ack Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      await configService.createAcknowledgementConfig(task.id, {
        instructions: "Please acknowledge",
      });

      const result = await taskService.getByIdWithConfig(task.id);

      expect(result).toBeDefined();
      expect(result!.type).toBe("ACKNOWLEDGEMENT");
      expect(result!.config).toBeDefined();
      expect((result!.config as any).instructions).toBe("Please acknowledge");
    });

    it("should return APPROVAL task with approval config", async () => {
      const { section } = await createWorkspaceAndSection("Config Loading APPROVAL");

      const task = await taskService.create({
        sectionId: section.id,
        title: "Approval Task",
        position: 0,
        type: "APPROVAL",
      });
      createdTaskIds.push(task.id);

      await configService.createApprovalConfig(task.id);

      const result = await taskService.getByIdWithConfig(task.id);

      expect(result).toBeDefined();
      expect(result!.type).toBe("APPROVAL");
      expect(result!.config).toBeDefined();
    });

    it("should return null config when config does not exist", async () => {
      const { section } = await createWorkspaceAndSection("Config Loading None");

      const task = await taskService.create({
        sectionId: section.id,
        title: "No Config Task",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task.id);

      // Don't create config

      const result = await taskService.getByIdWithConfig(task.id);

      expect(result).toBeDefined();
      expect(result!.config).toBeNull();
    });

    it("should return null for non-existent task", async () => {
      const result = await taskService.getByIdWithConfig("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("getByIdFull", () => {
    it("should return task with both config and lock status", async () => {
      const { section } = await createWorkspaceAndSection("Full Task Loading");

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Prerequisite",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Dependent Form Task",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      // Create config for task2
      await configService.createFormConfig(task2.id);

      // Create dependency
      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      const result = await taskService.getByIdFull(task2.id);

      expect(result).toBeDefined();
      expect(result!.locked).toBe(true); // Has incomplete dependency
      expect(result!.config).toBeDefined(); // Has config
    });
  });
});
