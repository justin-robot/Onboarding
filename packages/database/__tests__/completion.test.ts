import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { dependencyService } from "../services/dependency";
import { completionService } from "../services/completion";

describe("CompletionService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdAssigneeIds: string[] = [];
  const createdDependencyIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdDependencyIds) {
      await database.deleteFrom("task_dependency").where("id", "=", id).execute();
    }
    for (const id of createdAssigneeIds) {
      await database.deleteFrom("task_assignee").where("id", "=", id).execute();
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
    for (const id of createdUserIds) {
      await database.deleteFrom("user").where("id", "=", id).execute();
    }
  });

  // Helper to create a test user
  async function createTestUser() {
    const user = await database
      .insertInto("user")
      .values({
        name: `Test User ${Date.now()}`,
        email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
        emailVerified: false,
        banned: false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    createdUserIds.push(user.id);
    return user;
  }

  // Helper to create a task with assignees
  async function createTestTask(options: {
    completionRule?: "any" | "all";
    assigneeCount?: number;
  } = {}) {
    const { completionRule = "all", assigneeCount = 1 } = options;

    const workspace = await workspaceService.create({ name: `Completion Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    const task = await database
      .insertInto("task")
      .values({
        sectionId: section.id,
        title: "Test Task",
        position: 0,
        type: "ACKNOWLEDGEMENT",
        completionRule,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    createdTaskIds.push(task.id);

    // Create real users and assignees
    const assignees = [];
    for (let i = 0; i < assigneeCount; i++) {
      const user = await createTestUser();
      const assignee = await database
        .insertInto("task_assignee")
        .values({
          taskId: task.id,
          userId: user.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdAssigneeIds.push(assignee.id);
      assignees.push(assignee);
    }

    return { workspace, section, task, assignees };
  }

  describe("completeTaskForUser", () => {
    it("should reject if user is not assigned to task", async () => {
      const { task } = await createTestTask();

      const result = await completionService.completeTaskForUser(task.id, "non-existent-user");

      expect(result.success).toBe(false);
      expect(result.error).toBe("USER_NOT_ASSIGNED");
    });

    it("should reject if task is locked (dependency not completed)", async () => {
      // Create prerequisite task
      const { task: prereqTask, section } = await createTestTask();

      // Create dependent task
      const dependentTask = await database
        .insertInto("task")
        .values({
          sectionId: section.id,
          title: "Dependent Task",
          position: 1,
          type: "ACKNOWLEDGEMENT",
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdTaskIds.push(dependentTask.id);

      // Create user and assign to dependent task
      const user = await createTestUser();
      const assignee = await database
        .insertInto("task_assignee")
        .values({
          taskId: dependentTask.id,
          userId: user.id,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      createdAssigneeIds.push(assignee.id);

      // Create dependency
      const dependency = await dependencyService.create({
        taskId: dependentTask.id,
        dependsOnTaskId: prereqTask.id,
        type: "unlock",
      });
      createdDependencyIds.push(dependency.id);

      // Try to complete dependent task (should fail - prereq not done)
      const result = await completionService.completeTaskForUser(dependentTask.id, user.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("TASK_LOCKED");
    });

    it("should mark assignee as completed", async () => {
      const { task, assignees } = await createTestTask();
      const userId = assignees[0].userId;

      const result = await completionService.completeTaskForUser(task.id, userId);

      expect(result.success).toBe(true);

      // Verify assignee status updated
      const updatedAssignee = await database
        .selectFrom("task_assignee")
        .selectAll()
        .where("id", "=", assignees[0].id)
        .executeTakeFirst();

      expect(updatedAssignee?.status).toBe("completed");
      expect(updatedAssignee?.completedAt).toBeInstanceOf(Date);
    });

    it("should complete task immediately with 'any' completion rule", async () => {
      const { task, assignees } = await createTestTask({
        completionRule: "any",
        assigneeCount: 3,
      });

      // Complete for first user only
      const result = await completionService.completeTaskForUser(task.id, assignees[0].userId);

      expect(result.success).toBe(true);
      expect(result.taskCompleted).toBe(true);

      // Verify task is completed
      const updatedTask = await taskService.getById(task.id);
      expect(updatedTask?.status).toBe("completed");
      expect(updatedTask?.completedAt).toBeInstanceOf(Date);
    });

    it("should not complete task with 'all' rule until all assignees complete", async () => {
      const { task, assignees } = await createTestTask({
        completionRule: "all",
        assigneeCount: 3,
      });

      // Complete for first user
      const result1 = await completionService.completeTaskForUser(task.id, assignees[0].userId);
      expect(result1.success).toBe(true);
      expect(result1.taskCompleted).toBe(false);

      // Task should still be in progress
      let updatedTask = await taskService.getById(task.id);
      expect(updatedTask?.status).toBe("in_progress");

      // Complete for second user
      const result2 = await completionService.completeTaskForUser(task.id, assignees[1].userId);
      expect(result2.success).toBe(true);
      expect(result2.taskCompleted).toBe(false);

      // Still not complete
      updatedTask = await taskService.getById(task.id);
      expect(updatedTask?.status).toBe("in_progress");

      // Complete for third user
      const result3 = await completionService.completeTaskForUser(task.id, assignees[2].userId);
      expect(result3.success).toBe(true);
      expect(result3.taskCompleted).toBe(true);

      // Now task should be completed
      updatedTask = await taskService.getById(task.id);
      expect(updatedTask?.status).toBe("completed");
      expect(updatedTask?.completedAt).toBeInstanceOf(Date);
    });

    it("should reject if assignee already completed", async () => {
      // Use 2 assignees with "all" rule so task stays in_progress after first completion
      const { task, assignees } = await createTestTask({
        completionRule: "all",
        assigneeCount: 2,
      });
      const userId = assignees[0].userId;

      // Complete first time
      await completionService.completeTaskForUser(task.id, userId);

      // Try to complete again with same user
      const result = await completionService.completeTaskForUser(task.id, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("ALREADY_COMPLETED");
    });

    it("should reject if task is already completed", async () => {
      const { task, assignees } = await createTestTask({
        completionRule: "any",
        assigneeCount: 2,
      });

      // Complete with first user (completes task due to "any" rule)
      await completionService.completeTaskForUser(task.id, assignees[0].userId);

      // Try to complete with second user
      const result = await completionService.completeTaskForUser(task.id, assignees[1].userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe("TASK_ALREADY_COMPLETED");
    });

    it("should set task status to in_progress on first completion with 'all' rule", async () => {
      const { task, assignees } = await createTestTask({
        completionRule: "all",
        assigneeCount: 2,
      });

      // Verify initial status
      let currentTask = await taskService.getById(task.id);
      expect(currentTask?.status).toBe("not_started");

      // Complete for first user
      await completionService.completeTaskForUser(task.id, assignees[0].userId);

      // Status should now be in_progress
      currentTask = await taskService.getById(task.id);
      expect(currentTask?.status).toBe("in_progress");
    });
  });

  describe("getAssigneesByTaskId", () => {
    it("should return all assignees for a task", async () => {
      const { task, assignees } = await createTestTask({ assigneeCount: 3 });

      const result = await completionService.getAssigneesByTaskId(task.id);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.id).sort()).toEqual(assignees.map(a => a.id).sort());
    });
  });

  describe("addAssignee", () => {
    it("should add an assignee to a task", async () => {
      const { task } = await createTestTask({ assigneeCount: 0 });
      const user = await createTestUser();

      const assignee = await completionService.addAssignee(task.id, user.id);
      createdAssigneeIds.push(assignee.id);

      expect(assignee.taskId).toBe(task.id);
      expect(assignee.userId).toBe(user.id);
      expect(assignee.status).toBe("pending");
    });

    it("should not add duplicate assignee", async () => {
      const { task, assignees } = await createTestTask();

      await expect(
        completionService.addAssignee(task.id, assignees[0].userId)
      ).rejects.toThrow();
    });
  });

  describe("removeAssignee", () => {
    it("should remove an assignee from a task", async () => {
      const { task, assignees } = await createTestTask({ assigneeCount: 2 });

      const result = await completionService.removeAssignee(task.id, assignees[0].userId);
      expect(result).toBe(true);

      // Remove from cleanup list since we deleted it
      const idx = createdAssigneeIds.indexOf(assignees[0].id);
      if (idx > -1) createdAssigneeIds.splice(idx, 1);

      const remaining = await completionService.getAssigneesByTaskId(task.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(assignees[1].id);
    });
  });
});
