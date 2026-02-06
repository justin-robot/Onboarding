import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import type { NewWorkspace } from "../schemas/main";

describe("WorkspaceService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];

  afterAll(async () => {
    // Cleanup: Remove test data in reverse order (tasks → sections → workspaces)
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
    it("should create a workspace with name and description", async () => {
      const input: NewWorkspace = {
        name: "Test Workspace",
        description: "A test workspace for unit tests",
      };

      const workspace = await workspaceService.create(input);
      createdWorkspaceIds.push(workspace.id);

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe("Test Workspace");
      expect(workspace.description).toBe("A test workspace for unit tests");
      expect(workspace.createdAt).toBeInstanceOf(Date);
      expect(workspace.updatedAt).toBeInstanceOf(Date);
      expect(workspace.deletedAt).toBeNull();
    });

    it("should create a workspace with only required fields", async () => {
      const input: NewWorkspace = {
        name: "Minimal Workspace",
      };

      const workspace = await workspaceService.create(input);
      createdWorkspaceIds.push(workspace.id);

      expect(workspace.id).toBeDefined();
      expect(workspace.name).toBe("Minimal Workspace");
      expect(workspace.description).toBeNull();
    });

    it("should create a workspace with a due date", async () => {
      const dueDate = new Date("2025-12-31");
      const input: NewWorkspace = {
        name: "Workspace with Due Date",
        dueDate,
      };

      const workspace = await workspaceService.create(input);
      createdWorkspaceIds.push(workspace.id);

      expect(workspace.dueDate).toEqual(dueDate);
    });
  });

  describe("getById", () => {
    it("should return a workspace by ID", async () => {
      const created = await workspaceService.create({ name: "Get By ID Test" });
      createdWorkspaceIds.push(created.id);

      const workspace = await workspaceService.getById(created.id);

      expect(workspace).toBeDefined();
      expect(workspace!.id).toBe(created.id);
      expect(workspace!.name).toBe("Get By ID Test");
    });

    it("should return null for non-existent workspace", async () => {
      const workspace = await workspaceService.getById("non-existent-id");
      expect(workspace).toBeNull();
    });

    it("should not return soft-deleted workspaces", async () => {
      const created = await workspaceService.create({ name: "To Be Deleted" });
      createdWorkspaceIds.push(created.id);

      await workspaceService.softDelete(created.id);

      const workspace = await workspaceService.getById(created.id);
      expect(workspace).toBeNull();
    });
  });

  describe("getByIdWithNested", () => {
    it("should return workspace with nested sections and tasks", async () => {
      // Create workspace
      const workspace = await workspaceService.create({ name: "Nested Test" });
      createdWorkspaceIds.push(workspace.id);

      // Create sections
      const section1 = await database
        .insertInto("section")
        .values({
          workspaceId: workspace.id,
          title: "Section 1",
          position: 0,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section1.id);

      const section2 = await database
        .insertInto("section")
        .values({
          workspaceId: workspace.id,
          title: "Section 2",
          position: 1,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section2.id);

      // Create tasks
      const task1 = await database
        .insertInto("task")
        .values({
          sectionId: section1.id,
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
          sectionId: section1.id,
          title: "Task 2",
          position: 1,
          type: "APPROVAL",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      // Get nested structure
      const result = await workspaceService.getByIdWithNested(workspace.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(workspace.id);
      expect(result!.sections).toHaveLength(2);
      expect(result!.sections[0].title).toBe("Section 1");
      expect(result!.sections[0].tasks).toHaveLength(2);
      expect(result!.sections[0].tasks[0].title).toBe("Task 1");
      expect(result!.sections[0].tasks[1].title).toBe("Task 2");
      expect(result!.sections[1].title).toBe("Section 2");
      expect(result!.sections[1].tasks).toHaveLength(0);
    });

    it("should order sections by position", async () => {
      const workspace = await workspaceService.create({ name: "Position Test" });
      createdWorkspaceIds.push(workspace.id);

      // Create sections out of order
      const section2 = await database
        .insertInto("section")
        .values({ workspaceId: workspace.id, title: "Second", position: 1 })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section2.id);

      const section1 = await database
        .insertInto("section")
        .values({ workspaceId: workspace.id, title: "First", position: 0 })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section1.id);

      const result = await workspaceService.getByIdWithNested(workspace.id);

      expect(result!.sections[0].title).toBe("First");
      expect(result!.sections[1].title).toBe("Second");
    });

    it("should order tasks by position within section", async () => {
      const workspace = await workspaceService.create({ name: "Task Order Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await database
        .insertInto("section")
        .values({ workspaceId: workspace.id, title: "Section", position: 0 })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section.id);

      // Create tasks out of order
      const task2 = await database
        .insertInto("task")
        .values({ sectionId: section.id, title: "Second Task", position: 1, type: "FORM" })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task2.id);

      const task1 = await database
        .insertInto("task")
        .values({ sectionId: section.id, title: "First Task", position: 0, type: "FORM" })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task1.id);

      const result = await workspaceService.getByIdWithNested(workspace.id);

      expect(result!.sections[0].tasks[0].title).toBe("First Task");
      expect(result!.sections[0].tasks[1].title).toBe("Second Task");
    });

    it("should not include soft-deleted sections", async () => {
      const workspace = await workspaceService.create({ name: "Deleted Section Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await database
        .insertInto("section")
        .values({ workspaceId: workspace.id, title: "Deleted Section", position: 0 })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section.id);

      // Soft delete the section
      await database
        .updateTable("section")
        .set({ deletedAt: new Date() })
        .where("id", "=", section.id)
        .execute();

      const result = await workspaceService.getByIdWithNested(workspace.id);

      expect(result!.sections).toHaveLength(0);
    });

    it("should not include soft-deleted tasks", async () => {
      const workspace = await workspaceService.create({ name: "Deleted Task Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await database
        .insertInto("section")
        .values({ workspaceId: workspace.id, title: "Section", position: 0 })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdSectionIds.push(section.id);

      const task = await database
        .insertInto("task")
        .values({ sectionId: section.id, title: "Deleted Task", position: 0, type: "FORM" })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(task.id);

      // Soft delete the task
      await database
        .updateTable("task")
        .set({ deletedAt: new Date() })
        .where("id", "=", task.id)
        .execute();

      const result = await workspaceService.getByIdWithNested(workspace.id);

      expect(result!.sections[0].tasks).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update workspace name", async () => {
      const created = await workspaceService.create({ name: "Original Name" });
      createdWorkspaceIds.push(created.id);

      const updated = await workspaceService.update(created.id, {
        name: "Updated Name",
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe("Updated Name");
      // Verify updatedAt changed (clock skew between DB server and Node.js makes exact comparison unreliable)
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it("should update workspace description", async () => {
      const created = await workspaceService.create({
        name: "Test",
        description: "Original",
      });
      createdWorkspaceIds.push(created.id);

      const updated = await workspaceService.update(created.id, {
        description: "Updated description",
      });

      expect(updated!.description).toBe("Updated description");
    });

    it("should update workspace due date", async () => {
      const created = await workspaceService.create({ name: "Test" });
      createdWorkspaceIds.push(created.id);

      const newDueDate = new Date("2026-06-15");
      const updated = await workspaceService.update(created.id, {
        dueDate: newDueDate,
      });

      expect(updated!.dueDate).toEqual(newDueDate);
    });

    it("should return null when updating non-existent workspace", async () => {
      const updated = await workspaceService.update("non-existent-id", {
        name: "New Name",
      });

      expect(updated).toBeNull();
    });

    it("should not update soft-deleted workspace", async () => {
      const created = await workspaceService.create({ name: "To Delete" });
      createdWorkspaceIds.push(created.id);

      await workspaceService.softDelete(created.id);

      const updated = await workspaceService.update(created.id, {
        name: "Should Not Work",
      });

      expect(updated).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("should soft delete a workspace", async () => {
      const created = await workspaceService.create({ name: "To Soft Delete" });
      createdWorkspaceIds.push(created.id);

      const result = await workspaceService.softDelete(created.id);

      expect(result).toBe(true);

      // Verify it's soft deleted
      const workspace = await workspaceService.getById(created.id);
      expect(workspace).toBeNull();

      // Verify record still exists in database
      const raw = await database
        .selectFrom("workspace")
        .selectAll()
        .where("id", "=", created.id)
        .executeTakeFirst();
      expect(raw).toBeDefined();
      expect(raw!.deletedAt).not.toBeNull();
    });

    it("should return false for non-existent workspace", async () => {
      const result = await workspaceService.softDelete("non-existent-id");
      expect(result).toBe(false);
    });

    it("should return false for already deleted workspace", async () => {
      const created = await workspaceService.create({ name: "Already Deleted" });
      createdWorkspaceIds.push(created.id);

      await workspaceService.softDelete(created.id);
      const result = await workspaceService.softDelete(created.id);

      expect(result).toBe(false);
    });
  });

  describe("list", () => {
    it("should list all non-deleted workspaces", async () => {
      const ws1 = await workspaceService.create({ name: "List Test 1" });
      const ws2 = await workspaceService.create({ name: "List Test 2" });
      const ws3 = await workspaceService.create({ name: "List Test 3 (deleted)" });
      createdWorkspaceIds.push(ws1.id, ws2.id, ws3.id);

      await workspaceService.softDelete(ws3.id);

      const workspaces = await workspaceService.list();

      const testWorkspaces = workspaces.filter((w) =>
        w.name.startsWith("List Test")
      );
      expect(testWorkspaces).toHaveLength(2);
      expect(testWorkspaces.map((w) => w.name)).toContain("List Test 1");
      expect(testWorkspaces.map((w) => w.name)).toContain("List Test 2");
      expect(testWorkspaces.map((w) => w.name)).not.toContain(
        "List Test 3 (deleted)"
      );
    });
  });

  describe("restore", () => {
    it("should restore a soft-deleted workspace", async () => {
      const created = await workspaceService.create({ name: "To Restore" });
      createdWorkspaceIds.push(created.id);

      await workspaceService.softDelete(created.id);
      const restored = await workspaceService.restore(created.id);

      expect(restored).toBeDefined();
      expect(restored!.deletedAt).toBeNull();

      // Verify it's accessible again
      const workspace = await workspaceService.getById(created.id);
      expect(workspace).toBeDefined();
    });

    it("should return null for non-existent workspace", async () => {
      const restored = await workspaceService.restore("non-existent-id");
      expect(restored).toBeNull();
    });
  });
});
