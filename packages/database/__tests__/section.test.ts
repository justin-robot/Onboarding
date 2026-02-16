import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { sectionService } from "../services/section";
import { workspaceService } from "../services/workspace";
import { taskService } from "../services/task";
import type { NewSection } from "../schemas/main";

describe("SectionService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
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

  describe("create", () => {
    it("should create a section with title and position", async () => {
      const workspace = await workspaceService.create({ name: "Section Test Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const input: NewSection = {
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      };

      const section = await sectionService.create(input);
      createdSectionIds.push(section.id);

      expect(section.id).toBeDefined();
      expect(section.workspaceId).toBe(workspace.id);
      expect(section.title).toBe("Test Section");
      expect(section.position).toBe(0);
      expect(section.createdAt).toBeInstanceOf(Date);
      expect(section.deletedAt).toBeNull();
    });

    it("should create multiple sections with different positions", async () => {
      const workspace = await workspaceService.create({ name: "Multi Section Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section1 = await sectionService.create({
        workspaceId: workspace.id,
        title: "First",
        position: 0,
      });
      createdSectionIds.push(section1.id);

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Second",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      expect(section1.position).toBe(0);
      expect(section2.position).toBe(1);
    });
  });

  describe("getById", () => {
    it("should return a section by ID", async () => {
      const workspace = await workspaceService.create({ name: "GetById Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const created = await sectionService.create({
        workspaceId: workspace.id,
        title: "Get By ID Test",
        position: 0,
      });
      createdSectionIds.push(created.id);

      const section = await sectionService.getById(created.id);

      expect(section).toBeDefined();
      expect(section!.id).toBe(created.id);
      expect(section!.title).toBe("Get By ID Test");
    });

    it("should return null for non-existent section", async () => {
      const section = await sectionService.getById("non-existent-id");
      expect(section).toBeNull();
    });

    it("should not return soft-deleted sections", async () => {
      const workspace = await workspaceService.create({ name: "Soft Delete Test" });
      createdWorkspaceIds.push(workspace.id);

      const created = await sectionService.create({
        workspaceId: workspace.id,
        title: "To Be Deleted",
        position: 0,
      });
      createdSectionIds.push(created.id);

      await sectionService.softDelete(created.id);

      const section = await sectionService.getById(created.id);
      expect(section).toBeNull();
    });
  });

  describe("getByWorkspaceId", () => {
    it("should return sections ordered by position", async () => {
      const workspace = await workspaceService.create({ name: "Ordered Sections" });
      createdWorkspaceIds.push(workspace.id);

      // Create out of order
      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Second",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      const section1 = await sectionService.create({
        workspaceId: workspace.id,
        title: "First",
        position: 0,
      });
      createdSectionIds.push(section1.id);

      const section3 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Third",
        position: 2,
      });
      createdSectionIds.push(section3.id);

      const sections = await sectionService.getByWorkspaceId(workspace.id);

      expect(sections).toHaveLength(3);
      expect(sections[0].title).toBe("First");
      expect(sections[1].title).toBe("Second");
      expect(sections[2].title).toBe("Third");
    });

    it("should not include soft-deleted sections", async () => {
      const workspace = await workspaceService.create({ name: "Exclude Deleted" });
      createdWorkspaceIds.push(workspace.id);

      const section1 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Active",
        position: 0,
      });
      createdSectionIds.push(section1.id);

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Deleted",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      await sectionService.softDelete(section2.id);

      const sections = await sectionService.getByWorkspaceId(workspace.id);

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe("Active");
    });

    it("should return empty array for workspace with no sections", async () => {
      const workspace = await workspaceService.create({ name: "Empty Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const sections = await sectionService.getByWorkspaceId(workspace.id);

      expect(sections).toEqual([]);
    });
  });

  describe("getByIdWithTasks", () => {
    it("should return section with nested tasks", async () => {
      const workspace = await workspaceService.create({ name: "Nested Tasks Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Section With Tasks",
        position: 0,
      });
      createdSectionIds.push(section.id);

      // Create tasks
      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 1",
          position: 0,
          type: "FORM",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const task2 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 2",
          position: 1,
          type: "APPROVAL",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      const result = await sectionService.getByIdWithTasks(section.id);

      expect(result).toBeDefined();
      expect(result!.tasks).toHaveLength(2);
      expect(result!.tasks[0].title).toBe("Task 1");
      expect(result!.tasks[1].title).toBe("Task 2");
    });

    it("should order tasks by position", async () => {
      const workspace = await workspaceService.create({ name: "Task Order Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      // Create out of order
      const task2 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Second Task",
          position: 1,
          type: "FORM",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "First Task",
          position: 0,
          type: "FORM",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const result = await sectionService.getByIdWithTasks(section.id);

      expect(result!.tasks[0].title).toBe("First Task");
      expect(result!.tasks[1].title).toBe("Second Task");
    });

    it("should not include soft-deleted tasks", async () => {
      const workspace = await workspaceService.create({ name: "Deleted Task Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Deleted Task",
          position: 0,
          type: "FORM",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task.id);

      // Soft delete
      await database
        .updateTable("task")
        .set({ deletedAt: new Date() })
        .where("id", "=", task.id)
        .execute();

      const result = await sectionService.getByIdWithTasks(section.id);

      expect(result!.tasks).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update section title", async () => {
      const workspace = await workspaceService.create({ name: "Update Title Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const created = await sectionService.create({
        workspaceId: workspace.id,
        title: "Original Title",
        position: 0,
      });
      createdSectionIds.push(created.id);

      const updated = await sectionService.update(created.id, {
        title: "Updated Title",
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe("Updated Title");
    });

    it("should return null when updating non-existent section", async () => {
      const updated = await sectionService.update("non-existent-id", {
        title: "New Title",
      });

      expect(updated).toBeNull();
    });

    it("should not update soft-deleted section", async () => {
      const workspace = await workspaceService.create({ name: "Update Deleted Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const created = await sectionService.create({
        workspaceId: workspace.id,
        title: "To Delete",
        position: 0,
      });
      createdSectionIds.push(created.id);

      await sectionService.softDelete(created.id);

      const updated = await sectionService.update(created.id, {
        title: "Should Not Work",
      });

      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a section", async () => {
      const workspace = await workspaceService.create({ name: "Soft Delete Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const created = await sectionService.create({
        workspaceId: workspace.id,
        title: "To Soft Delete",
        position: 0,
      });
      createdSectionIds.push(created.id);

      const result = await sectionService.softDelete(created.id);

      expect(result).toBe(true);

      // Verify it's soft deleted
      const section = await sectionService.getById(created.id);
      expect(section).toBeNull();

      // Verify record still exists
      const raw = await database
        .selectFrom("section")
        .selectAll()
        .where("id", "=", created.id)
        .executeTakeFirst();
      expect(raw).toBeDefined();
      expect(raw!.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent section", async () => {
      const result = await sectionService.softDelete("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("reorder", () => {
    it("should reorder sections by array of IDs", async () => {
      const workspace = await workspaceService.create({ name: "Reorder Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section1 = await sectionService.create({
        workspaceId: workspace.id,
        title: "A",
        position: 0,
      });
      createdSectionIds.push(section1.id);

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "B",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      const section3 = await sectionService.create({
        workspaceId: workspace.id,
        title: "C",
        position: 2,
      });
      createdSectionIds.push(section3.id);

      // Reorder: C, A, B
      await sectionService.reorder(workspace.id, [section3.id, section1.id, section2.id]);

      const sections = await sectionService.getByWorkspaceId(workspace.id);

      expect(sections[0].title).toBe("C");
      expect(sections[0].position).toBe(0);
      expect(sections[1].title).toBe("A");
      expect(sections[1].position).toBe(1);
      expect(sections[2].title).toBe("B");
      expect(sections[2].position).toBe(2);
    });

    it("should handle reordering with only two sections", async () => {
      const workspace = await workspaceService.create({ name: "Two Section Reorder" });
      createdWorkspaceIds.push(workspace.id);

      const section1 = await sectionService.create({
        workspaceId: workspace.id,
        title: "First",
        position: 0,
      });
      createdSectionIds.push(section1.id);

      const section2 = await sectionService.create({
        workspaceId: workspace.id,
        title: "Second",
        position: 1,
      });
      createdSectionIds.push(section2.id);

      // Swap order
      await sectionService.reorder(workspace.id, [section2.id, section1.id]);

      const sections = await sectionService.getByWorkspaceId(workspace.id);

      expect(sections[0].title).toBe("Second");
      expect(sections[1].title).toBe("First");
    });
  });

  describe("getProgress", () => {
    it("should compute progress from task completion", async () => {
      const workspace = await workspaceService.create({ name: "Progress Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Progress Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      // Create 3 tasks, 1 completed
      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 1",
          position: 0,
          type: "FORM",
          status: "completed",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const task2 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 2",
          position: 1,
          type: "FORM",
          status: "not_started",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      const task3 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 3",
          position: 2,
          type: "FORM",
          status: "in_progress",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task3.id);

      const progress = await sectionService.getProgress(section.id);

      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBeCloseTo(33.33, 1);
    });

    it("should return 0% for section with no tasks", async () => {
      const workspace = await workspaceService.create({ name: "Empty Progress Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Empty Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const progress = await sectionService.getProgress(section.id);

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it("should return 100% when all tasks completed", async () => {
      const workspace = await workspaceService.create({ name: "Complete Workspace" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Complete Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 1",
          position: 0,
          type: "FORM",
          status: "completed",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const task2 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Task 2",
          position: 1,
          type: "FORM",
          status: "completed",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      const progress = await sectionService.getProgress(section.id);

      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(2);
      expect(progress.percentage).toBe(100);
    });

    it("should not count soft-deleted tasks in progress", async () => {
      const workspace = await workspaceService.create({ name: "Deleted Task Progress" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Active Task",
          position: 0,
          type: "FORM",
          status: "completed",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const task2 = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Deleted Task",
          position: 1,
          type: "FORM",
          status: "not_started",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      // Soft delete task2
      await database
        .updateTable("task")
        .set({ deletedAt: new Date() })
        .where("id", "=", task2.id)
        .execute();

      const progress = await sectionService.getProgress(section.id);

      expect(progress.total).toBe(1);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBe(100);
    });
  });

  describe("getStatus", () => {
    it("should return 'not_started' when all tasks are not_started", async () => {
      const workspace = await workspaceService.create({ name: "Not Started Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("not_started");
    });

    it("should return 'in_progress' when any task is in_progress", async () => {
      const workspace = await workspaceService.create({ name: "In Progress Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      // Set task1 to in_progress
      await database
        .updateTable("task")
        .set({ status: "in_progress" })
        .where("id", "=", task1.id)
        .execute();

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("in_progress");
    });

    it("should return 'in_progress' when some tasks completed but not all", async () => {
      const workspace = await workspaceService.create({ name: "Partial Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      // Set task1 to completed
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task1.id)
        .execute();

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("in_progress");
    });

    it("should return 'completed' when all tasks are completed", async () => {
      const workspace = await workspaceService.create({ name: "Completed Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      // Complete both tasks
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "in", [task1.id, task2.id])
        .execute();

      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("completed");
    });

    it("should return 'not_started' for empty section", async () => {
      const workspace = await workspaceService.create({ name: "Empty Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("not_started");
    });

    it("should not count soft-deleted tasks", async () => {
      const workspace = await workspaceService.create({ name: "Deleted Tasks Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      // Complete task1
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task1.id)
        .execute();

      // Create and soft-delete task2 (not_started)
      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      await database
        .updateTable("task")
        .set({ deletedAt: new Date() })
        .where("id", "=", task2.id)
        .execute();

      // Only task1 (completed) counts, so section should be completed
      const status = await sectionService.getStatus(section.id);
      expect(status).toBe("completed");
    });
  });

  describe("getByIdWithStatus", () => {
    it("should return section with computed status and progress", async () => {
      const workspace = await workspaceService.create({ name: "Full Section" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task 1",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      // Complete task1
      await database
        .updateTable("task")
        .set({ status: "completed", completedAt: new Date() })
        .where("id", "=", task1.id)
        .execute();

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task 2",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      const result = await sectionService.getByIdWithStatus(section.id);

      expect(result).not.toBeNull();
      expect(result!.status).toBe("in_progress");
      expect(result!.completedCount).toBe(1);
      expect(result!.totalCount).toBe(2);
    });
  });
});
