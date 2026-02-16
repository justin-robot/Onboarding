import { describe, it, expect, afterAll, vi, beforeEach } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { assigneeService } from "../services/assignee";
import { dueDateReminderService } from "../services/dueDateReminder";
import type { NotificationContext } from "../services/notificationContext";

describe("DueDateReminderService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdUserIds: string[] = [];

  // Mock notification trigger
  let mockTrigger: ReturnType<typeof vi.fn>;
  let notificationContext: NotificationContext;

  beforeEach(() => {
    mockTrigger = vi.fn().mockResolvedValue({ success: true, workflowRunId: "mock-123" });
    notificationContext = {
      triggerWorkflow: mockTrigger,
    };
  });

  afterAll(async () => {
    // Cleanup in reverse order
    await database.deleteFrom("task_assignee").where("taskId", "in", createdTaskIds).execute();
    for (const id of createdTaskIds) {
      await database.deleteFrom("task").where("id", "=", id).execute();
    }
    for (const id of createdSectionIds) {
      await database.deleteFrom("section").where("id", "=", id).execute();
    }
    await database.deleteFrom("workspace_member").where("workspaceId", "in", createdWorkspaceIds).execute();
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
    for (const id of createdUserIds) {
      await database.deleteFrom("user").where("id", "=", id).execute();
    }
  });

  // Helper to create a test user
  async function createTestUser(name?: string) {
    const user = await database
      .insertInto("user")
      .values({
        name: name ?? `Test User ${Date.now()}`,
        email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: false,
        banned: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    createdUserIds.push(user.id);
    return user;
  }

  // Helper to create workspace with section
  async function createTestWorkspace() {
    const workspace = await workspaceService.create({ name: `Due Date Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    return { workspace, section };
  }

  describe("getApproachingTasks", () => {
    it("should find tasks with due dates within threshold", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      // Add user as workspace member
      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      // Create task with due date 12 hours from now
      const dueDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Approaching Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await assigneeService.assign(task.id, user.id);

      const approaching = await dueDateReminderService.getApproachingTasks(24);

      expect(approaching.length).toBeGreaterThanOrEqual(1);
      const found = approaching.find((t) => t.id === task.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Approaching Task");
      expect(found!.assigneeIds).toContain(user.id);
    });

    it("should not find tasks with due dates beyond threshold", async () => {
      const { workspace, section } = await createTestWorkspace();

      // Create task with due date 48 hours from now
      const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Far Future Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      const approaching = await dueDateReminderService.getApproachingTasks(24);

      const found = approaching.find((t) => t.id === task.id);
      expect(found).toBeUndefined();
    });

    it("should not find completed tasks", async () => {
      const { workspace, section } = await createTestWorkspace();

      // Create task with due date 12 hours from now but completed
      const dueDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Completed Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await taskService.markComplete(task.id);

      const approaching = await dueDateReminderService.getApproachingTasks(24);

      const found = approaching.find((t) => t.id === task.id);
      expect(found).toBeUndefined();
    });
  });

  describe("getOverdueTasks", () => {
    it("should find tasks with due dates in the past", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      // Add user as workspace member
      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      // Create task with due date 2 hours ago
      const dueDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Overdue Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await assigneeService.assign(task.id, user.id);

      const overdue = await dueDateReminderService.getOverdueTasks();

      expect(overdue.length).toBeGreaterThanOrEqual(1);
      const found = overdue.find((t) => t.id === task.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Overdue Task");
    });

    it("should not find completed overdue tasks", async () => {
      const { workspace, section } = await createTestWorkspace();

      // Create overdue task that is completed
      const dueDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Completed Overdue Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await taskService.markComplete(task.id);

      const overdue = await dueDateReminderService.getOverdueTasks();

      const found = overdue.find((t) => t.id === task.id);
      expect(found).toBeUndefined();
    });
  });

  describe("processReminders", () => {
    it("should trigger due-date-approaching for approaching tasks", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      // Add user as workspace member
      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      // Create task due in 12 hours
      const dueDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Reminder Test Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await assigneeService.assign(task.id, user.id);

      const result = await dueDateReminderService.processReminders(notificationContext);

      expect(result.approaching).toBeGreaterThanOrEqual(1);
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: "due-date-approaching",
          recipientId: user.id,
          data: expect.objectContaining({
            taskId: task.id,
            taskTitle: "Reminder Test Task",
          }),
        })
      );
    });

    it("should trigger due-date-passed for overdue tasks", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      // Add user as workspace member
      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      // Create overdue task
      const dueDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Overdue Reminder Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await assigneeService.assign(task.id, user.id);

      const result = await dueDateReminderService.processReminders(notificationContext);

      expect(result.overdue).toBeGreaterThanOrEqual(1);
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: "due-date-passed",
          recipientId: user.id,
          data: expect.objectContaining({
            taskId: task.id,
            taskTitle: "Overdue Reminder Task",
          }),
        })
      );
    });

    it("should notify all assignees of a task", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user1 = await createTestUser("User 1");
      const user2 = await createTestUser("User 2");

      // Add users as workspace members
      await database
        .insertInto("workspace_member")
        .values([
          { workspaceId: workspace.id, userId: user1.id, role: "user" },
          { workspaceId: workspace.id, userId: user2.id, role: "user" },
        ])
        .execute();

      // Create task with two assignees
      const dueDate = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const task = await taskService.create({
        sectionId: section.id,
        title: "Multi-Assignee Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: dueDate,
      });
      createdTaskIds.push(task.id);

      await assigneeService.assign(task.id, user1.id);
      await assigneeService.assign(task.id, user2.id);

      await dueDateReminderService.processReminders(notificationContext);

      // Both users should be notified
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: user1.id,
          data: expect.objectContaining({ taskId: task.id }),
        })
      );
      expect(mockTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: user2.id,
          data: expect.objectContaining({ taskId: task.id }),
        })
      );
    });

    it("should return correct counts", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      // Create one approaching and one overdue task
      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Approaching",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: new Date(Date.now() + 6 * 60 * 60 * 1000),
      });
      createdTaskIds.push(task1.id);
      await assigneeService.assign(task1.id, user.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Overdue",
        position: 1,
        type: "ACKNOWLEDGEMENT",
        dueDateValue: new Date(Date.now() - 6 * 60 * 60 * 1000),
      });
      createdTaskIds.push(task2.id);
      await assigneeService.assign(task2.id, user.id);

      const result = await dueDateReminderService.processReminders(notificationContext);

      expect(result.approaching).toBeGreaterThanOrEqual(1);
      expect(result.overdue).toBeGreaterThanOrEqual(1);
      expect(result.notificationsSent).toBeGreaterThanOrEqual(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("getDeduplicationKey", () => {
    it("should generate consistent deduplication keys", () => {
      const taskId = "task-123";
      const eventType = "due-date-approaching";
      const date = new Date("2024-12-25T10:30:00Z");

      const key = dueDateReminderService.getDeduplicationKey(taskId, eventType, date);

      expect(key).toBe("task-123-due-date-approaching-2024-12-25");
    });

    it("should generate different keys for different dates", () => {
      const taskId = "task-123";
      const eventType = "due-date-approaching";
      const date1 = new Date("2024-12-25T10:30:00Z");
      const date2 = new Date("2024-12-26T10:30:00Z");

      const key1 = dueDateReminderService.getDeduplicationKey(taskId, eventType, date1);
      const key2 = dueDateReminderService.getDeduplicationKey(taskId, eventType, date2);

      expect(key1).not.toBe(key2);
    });
  });
});
