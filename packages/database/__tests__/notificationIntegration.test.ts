import { describe, it, expect, afterAll, vi, beforeEach } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { assigneeService } from "../services/assignee";
import { completionService } from "../services/completion";
import { dependencyService } from "../services/dependency";
import type { NotificationContext } from "../services/notificationContext";

describe("Notification Integration", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdDependencyIds: string[] = [];

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
    for (const id of createdDependencyIds) {
      await database.deleteFrom("task_dependency").where("id", "=", id).execute();
    }
    await database.deleteFrom("task_assignee").where("taskId", "in", createdTaskIds).execute();
    for (const id of createdTaskIds) {
      await database.deleteFrom("task").where("id", "=", id).execute();
    }
    for (const id of createdSectionIds) {
      await database.deleteFrom("section").where("id", "=", id).execute();
    }
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

  // Helper to create workspace with section and task
  async function createTestWorkspace() {
    const workspace = await workspaceService.create({ name: `Notification Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    return { workspace, section };
  }

  describe("Task Assignment Notifications", () => {
    it("should trigger task-assigned notification when assigning a user", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser("John Doe");

      // Add user as workspace member first
      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      const task = await taskService.create({
        sectionId: section.id,
        title: "Review Document",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      const result = await assigneeService.assign(
        task.id,
        user.id,
        notificationContext
      );

      expect(result.success).toBe(true);
      expect(mockTrigger).toHaveBeenCalledWith({
        workflowId: "task-assigned",
        recipientId: user.id,
        data: expect.objectContaining({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          taskId: task.id,
          taskTitle: task.title,
        }),
        tenant: workspace.id,
      });
    });

    it("should not trigger notification when assignment fails", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      const task = await taskService.create({
        sectionId: section.id,
        title: "Test Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      // Try to assign without being a workspace member
      const result = await assigneeService.assign(
        task.id,
        user.id,
        notificationContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("NOT_WORKSPACE_MEMBER");
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });

  describe("Task Completion - Your Turn Notifications", () => {
    it("should trigger task-your-turn for next task assignees when task completes", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user1 = await createTestUser("User One");
      const user2 = await createTestUser("User Two");

      // Add users as workspace members
      await database
        .insertInto("workspace_member")
        .values([
          { workspaceId: workspace.id, userId: user1.id, role: "user" },
          { workspaceId: workspace.id, userId: user2.id, role: "user" },
        ])
        .execute();

      // Create two tasks with unlock dependency
      const task1 = await taskService.create({
        sectionId: section.id,
        title: "First Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Second Task",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      // Create dependency: task2 depends on task1
      const dep = await dependencyService.create({
        taskId: task2.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Assign users
      await assigneeService.assign(task1.id, user1.id);
      await assigneeService.assign(task2.id, user2.id);

      // Complete task1 with notification context
      const result = await completionService.completeTaskForUser(
        task1.id,
        user1.id,
        notificationContext
      );

      expect(result.success).toBe(true);
      expect(result.taskCompleted).toBe(true);

      // Should notify user2 that task2 is now their turn
      expect(mockTrigger).toHaveBeenCalledWith({
        workflowId: "task-your-turn",
        recipientId: user2.id,
        data: expect.objectContaining({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          taskId: task2.id,
          taskTitle: task2.title,
        }),
        tenant: workspace.id,
      });
    });

    it("should not trigger your-turn if next task is still locked by other dependencies", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();

      // Add users as workspace members
      await database
        .insertInto("workspace_member")
        .values([
          { workspaceId: workspace.id, userId: user1.id, role: "user" },
          { workspaceId: workspace.id, userId: user2.id, role: "user" },
          { workspaceId: workspace.id, userId: user3.id, role: "user" },
        ])
        .execute();

      // Create three tasks
      const task1 = await taskService.create({
        sectionId: section.id,
        title: "Task A",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task1.id);

      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Task B",
        position: 1,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task2.id);

      const task3 = await taskService.create({
        sectionId: section.id,
        title: "Task C",
        position: 2,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task3.id);

      // Task3 depends on both task1 AND task2
      const dep1 = await dependencyService.create({
        taskId: task3.id,
        dependsOnTaskId: task1.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep1.id);

      const dep2 = await dependencyService.create({
        taskId: task3.id,
        dependsOnTaskId: task2.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep2.id);

      // Assign users
      await assigneeService.assign(task1.id, user1.id);
      await assigneeService.assign(task2.id, user2.id);
      await assigneeService.assign(task3.id, user3.id);

      // Complete task1 - task3 is still locked by task2
      const result = await completionService.completeTaskForUser(
        task1.id,
        user1.id,
        notificationContext
      );

      expect(result.success).toBe(true);

      // Should NOT trigger your-turn for task3 because task2 is still incomplete
      expect(mockTrigger).not.toHaveBeenCalledWith(
        expect.objectContaining({ workflowId: "task-your-turn" })
      );
    });
  });

  describe("Approval Task Notifications", () => {
    it("should trigger approval-requested when approval task becomes unlocked", async () => {
      const { workspace, section } = await createTestWorkspace();
      const submitter = await createTestUser("Submitter");
      const approver = await createTestUser("Approver");

      // Add users as workspace members
      await database
        .insertInto("workspace_member")
        .values([
          { workspaceId: workspace.id, userId: submitter.id, role: "user" },
          { workspaceId: workspace.id, userId: approver.id, role: "user" },
        ])
        .execute();

      // Create a form task and an approval task
      const formTask = await taskService.create({
        sectionId: section.id,
        title: "Submit Form",
        position: 0,
        type: "FORM",
      });
      createdTaskIds.push(formTask.id);

      const approvalTask = await taskService.create({
        sectionId: section.id,
        title: "Approve Submission",
        position: 1,
        type: "APPROVAL",
      });
      createdTaskIds.push(approvalTask.id);

      // Approval task depends on form task
      const dep = await dependencyService.create({
        taskId: approvalTask.id,
        dependsOnTaskId: formTask.id,
        type: "unlock",
      });
      createdDependencyIds.push(dep.id);

      // Assign users
      await assigneeService.assign(formTask.id, submitter.id);
      await assigneeService.assign(approvalTask.id, approver.id);

      // Complete form task - this should unlock approval task
      const result = await completionService.completeTaskForUser(
        formTask.id,
        submitter.id,
        notificationContext
      );

      expect(result.success).toBe(true);

      // Should trigger approval-requested for the approver
      expect(mockTrigger).toHaveBeenCalledWith({
        workflowId: "approval-requested",
        recipientId: approver.id,
        data: expect.objectContaining({
          workspaceId: workspace.id,
          taskId: approvalTask.id,
          taskTitle: approvalTask.title,
        }),
        tenant: workspace.id,
      });
    });
  });

  describe("Without notification context", () => {
    it("should not trigger notifications when context is not provided", async () => {
      const { workspace, section } = await createTestWorkspace();
      const user = await createTestUser();

      await database
        .insertInto("workspace_member")
        .values({ workspaceId: workspace.id, userId: user.id, role: "user" })
        .execute();

      const task = await taskService.create({
        sectionId: section.id,
        title: "Test Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      // Assign without notification context
      await assigneeService.assign(task.id, user.id);

      // No notifications should be triggered
      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });
});
