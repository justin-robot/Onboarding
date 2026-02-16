import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { memberService } from "../services/member";
import { assigneeService } from "../services/assignee";

describe("AssigneeService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdMemberIds: string[] = [];
  const createdAssigneeIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdAssigneeIds) {
      await database.deleteFrom("task_assignee").where("id", "=", id).execute();
    }
    for (const id of createdMemberIds) {
      await database.deleteFrom("workspace_member").where("id", "=", id).execute();
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

  // Helper to create workspace with section and task
  async function createTestTask() {
    const workspace = await workspaceService.create({ name: `Assignee Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    const task = await taskService.create({
      sectionId: section.id,
      title: "Test Task",
      position: 0,
      type: "ACKNOWLEDGEMENT",
    });
    createdTaskIds.push(task.id);

    return { workspace, section, task };
  }

  describe("assign", () => {
    it("should assign a workspace member to a task", async () => {
      const { workspace, task } = await createTestTask();
      const user = await createTestUser();

      // Add user as workspace member first
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Assign to task
      const result = await assigneeService.assign(task.id, user.id);
      createdAssigneeIds.push(result.assignee!.id);

      expect(result.success).toBe(true);
      expect(result.assignee!.taskId).toBe(task.id);
      expect(result.assignee!.userId).toBe(user.id);
      expect(result.assignee!.status).toBe("pending");
    });

    it("should reject assignment if user is not a workspace member", async () => {
      const { task } = await createTestTask();
      const user = await createTestUser();

      // Don't add user as workspace member

      const result = await assigneeService.assign(task.id, user.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("NOT_WORKSPACE_MEMBER");
    });

    it("should reject duplicate assignment", async () => {
      const { workspace, task } = await createTestTask();
      const user = await createTestUser();

      // Add user as workspace member
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // First assignment
      const result1 = await assigneeService.assign(task.id, user.id);
      createdAssigneeIds.push(result1.assignee!.id);

      // Second assignment (duplicate)
      const result2 = await assigneeService.assign(task.id, user.id);

      expect(result2.success).toBe(false);
      expect(result2.error).toBe("ALREADY_ASSIGNED");
    });

    it("should reject assignment to non-existent task", async () => {
      const user = await createTestUser();

      const result = await assigneeService.assign("non-existent-task", user.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("TASK_NOT_FOUND");
    });
  });

  describe("unassign", () => {
    it("should remove an assignee from a task", async () => {
      const { workspace, task } = await createTestTask();
      const user = await createTestUser();

      // Add user as workspace member
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Assign to task
      const result = await assigneeService.assign(task.id, user.id);
      // Don't add to cleanup - we're removing it

      // Unassign
      const removed = await assigneeService.unassign(task.id, user.id);
      expect(removed).toBe(true);

      // Verify removed
      const assignees = await assigneeService.getByTaskId(task.id);
      expect(assignees).toHaveLength(0);
    });

    it("should return false for non-existent assignment", async () => {
      const { task } = await createTestTask();

      const removed = await assigneeService.unassign(task.id, "non-existent-user");
      expect(removed).toBe(false);
    });
  });

  describe("getByTaskId", () => {
    it("should return all assignees for a task", async () => {
      const { workspace, task } = await createTestTask();
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Add users as workspace members
      const member1 = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user1.id,
        role: "user",
      });
      createdMemberIds.push(member1.id);

      const member2 = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user2.id,
        role: "user",
      });
      createdMemberIds.push(member2.id);

      // Assign both
      const result1 = await assigneeService.assign(task.id, user1.id);
      createdAssigneeIds.push(result1.assignee!.id);

      const result2 = await assigneeService.assign(task.id, user2.id);
      createdAssigneeIds.push(result2.assignee!.id);

      const assignees = await assigneeService.getByTaskId(task.id);

      expect(assignees).toHaveLength(2);
    });

    it("should return empty array for task with no assignees", async () => {
      const { task } = await createTestTask();

      const assignees = await assigneeService.getByTaskId(task.id);

      expect(assignees).toHaveLength(0);
    });
  });

  describe("getTasksForUser", () => {
    it("should return all tasks assigned to a user", async () => {
      const { workspace, section } = await createTestTask();
      const user = await createTestUser();

      // Create second task in same section
      const task2 = await taskService.create({
        sectionId: section.id,
        title: "Test Task 2",
        position: 1,
        type: "FORM",
      });
      createdTaskIds.push(task2.id);

      // Add user as workspace member
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Get the first task (created by createTestTask)
      const tasks = await taskService.getBySectionId(section.id);
      const task1 = tasks[0];

      // Assign user to both tasks
      const result1 = await assigneeService.assign(task1.id, user.id);
      createdAssigneeIds.push(result1.assignee!.id);

      const result2 = await assigneeService.assign(task2.id, user.id);
      createdAssigneeIds.push(result2.assignee!.id);

      const userTasks = await assigneeService.getTasksForUser(user.id);

      expect(userTasks).toHaveLength(2);
    });

    it("should return empty array if user has no assignments", async () => {
      const user = await createTestUser();

      const userTasks = await assigneeService.getTasksForUser(user.id);

      expect(userTasks).toHaveLength(0);
    });
  });

  describe("isAssigned", () => {
    it("should return true if user is assigned to task", async () => {
      const { workspace, task } = await createTestTask();
      const user = await createTestUser();

      // Add user as workspace member
      const member = await memberService.addMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "user",
      });
      createdMemberIds.push(member.id);

      // Assign to task
      const result = await assigneeService.assign(task.id, user.id);
      createdAssigneeIds.push(result.assignee!.id);

      const isAssigned = await assigneeService.isAssigned(task.id, user.id);
      expect(isAssigned).toBe(true);
    });

    it("should return false if user is not assigned to task", async () => {
      const { task } = await createTestTask();
      const user = await createTestUser();

      const isAssigned = await assigneeService.isAssigned(task.id, user.id);
      expect(isAssigned).toBe(false);
    });
  });
});
