import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { memberService } from "../services/member";
import { auditLogService, type AuditSource } from "../services/auditLog";

describe("Audit Integration", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdAuditLogIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdAuditLogIds) {
      await database.deleteFrom("moxo_audit_log_entry").where("id", "=", id).execute();
    }
    await database.deleteFrom("workspace_member").where("workspaceId", "in", createdWorkspaceIds).execute();
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

  // Audit context for testing
  const createAuditContext = (actorId: string): { actorId: string; source: AuditSource } => ({
    actorId,
    source: "web" as AuditSource,
  });

  describe("Workspace with audit logging", () => {
    it("should log workspace.created when creating a workspace with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create(
        { name: "Audit Test Workspace" },
        auditContext
      );
      createdWorkspaceIds.push(workspace.id);

      // Check audit log
      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const createEntry = entries.find((e) => e.eventType === "workspace.created");

      expect(createEntry).toBeDefined();
      expect(createEntry!.actorId).toBe(user.id);
      expect(createEntry!.source).toBe("web");
      expect(createEntry!.metadata).toEqual({ workspaceName: "Audit Test Workspace" });
      createdAuditLogIds.push(createEntry!.id);
    });

    it("should log workspace.updated when updating a workspace with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Original Name" });
      createdWorkspaceIds.push(workspace.id);

      const updated = await workspaceService.update(
        workspace.id,
        { name: "Updated Name" },
        auditContext
      );

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const updateEntry = entries.find((e) => e.eventType === "workspace.updated");

      expect(updateEntry).toBeDefined();
      expect(updateEntry!.actorId).toBe(user.id);
      expect(updateEntry!.metadata).toEqual({
        changes: { name: { from: "Original Name", to: "Updated Name" } },
      });
      createdAuditLogIds.push(updateEntry!.id);
    });

    it("should log workspace.deleted when soft-deleting a workspace with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "To Delete" });
      createdWorkspaceIds.push(workspace.id);

      await workspaceService.softDelete(workspace.id, auditContext);

      // Get entries directly since workspace is deleted
      const entries = await database
        .selectFrom("moxo_audit_log_entry")
        .selectAll()
        .where("workspaceId", "=", workspace.id)
        .execute();
      const deleteEntry = entries.find((e) => e.eventType === "workspace.deleted");

      expect(deleteEntry).toBeDefined();
      expect(deleteEntry!.actorId).toBe(user.id);
      createdAuditLogIds.push(deleteEntry!.id);
    });
  });

  describe("Section with audit logging", () => {
    it("should log section.created when creating a section with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Section Audit Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create(
        { workspaceId: workspace.id, title: "Test Section", position: 0 },
        auditContext
      );
      createdSectionIds.push(section.id);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const createEntry = entries.find((e) => e.eventType === "section.created");

      expect(createEntry).toBeDefined();
      expect(createEntry!.actorId).toBe(user.id);
      expect(createEntry!.metadata).toEqual({ sectionTitle: "Test Section" });
      createdAuditLogIds.push(createEntry!.id);
    });

    it("should log section.updated when updating a section with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Section Update Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Original Title",
        position: 0,
      });
      createdSectionIds.push(section.id);

      await sectionService.update(
        section.id,
        { title: "Updated Title" },
        auditContext
      );

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const updateEntry = entries.find((e) => e.eventType === "section.updated");

      expect(updateEntry).toBeDefined();
      expect(updateEntry!.metadata).toEqual({
        changes: { title: { from: "Original Title", to: "Updated Title" } },
      });
      createdAuditLogIds.push(updateEntry!.id);
    });

    it("should log section.deleted when soft-deleting a section with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Section Delete Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "To Delete",
        position: 0,
      });
      createdSectionIds.push(section.id);

      await sectionService.softDelete(section.id, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const deleteEntry = entries.find((e) => e.eventType === "section.deleted");

      expect(deleteEntry).toBeDefined();
      createdAuditLogIds.push(deleteEntry!.id);
    });
  });

  describe("Task with audit logging", () => {
    it("should log task.created when creating a task with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Task Audit Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await taskService.create(
        { sectionId: section.id, title: "Test Task", position: 0, type: "ACKNOWLEDGEMENT" },
        auditContext
      );
      createdTaskIds.push(task.id);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const createEntry = entries.find((e) => e.eventType === "task.created");

      expect(createEntry).toBeDefined();
      expect(createEntry!.taskId).toBe(task.id);
      expect(createEntry!.metadata).toEqual({ taskTitle: "Test Task", taskType: "ACKNOWLEDGEMENT" });
      createdAuditLogIds.push(createEntry!.id);
    });

    it("should log task.updated when updating a task with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Task Update Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await taskService.create({
        sectionId: section.id,
        title: "Original Title",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      await taskService.update(task.id, { title: "Updated Title" }, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const updateEntry = entries.find((e) => e.eventType === "task.updated");

      expect(updateEntry).toBeDefined();
      expect(updateEntry!.taskId).toBe(task.id);
      expect(updateEntry!.metadata).toEqual({
        changes: { title: { from: "Original Title", to: "Updated Title" } },
      });
      createdAuditLogIds.push(updateEntry!.id);
    });

    it("should log task.completed when marking a task complete with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Task Complete Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await taskService.create({
        sectionId: section.id,
        title: "To Complete",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      await taskService.markComplete(task.id, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const completeEntry = entries.find((e) => e.eventType === "task.completed");

      expect(completeEntry).toBeDefined();
      expect(completeEntry!.taskId).toBe(task.id);
      createdAuditLogIds.push(completeEntry!.id);
    });

    it("should log task.reopened when marking a task incomplete with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Task Reopen Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await taskService.create({
        sectionId: section.id,
        title: "To Reopen",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      // First complete it
      await taskService.markComplete(task.id);
      // Then reopen it
      await taskService.markIncomplete(task.id, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const reopenEntry = entries.find((e) => e.eventType === "task.reopened");

      expect(reopenEntry).toBeDefined();
      expect(reopenEntry!.taskId).toBe(task.id);
      createdAuditLogIds.push(reopenEntry!.id);
    });

    it("should log task.deleted when soft-deleting a task with audit context", async () => {
      const user = await createTestUser();
      const auditContext = createAuditContext(user.id);

      const workspace = await workspaceService.create({ name: "Task Delete Test" });
      createdWorkspaceIds.push(workspace.id);

      const section = await sectionService.create({
        workspaceId: workspace.id,
        title: "Test Section",
        position: 0,
      });
      createdSectionIds.push(section.id);

      const task = await taskService.create({
        sectionId: section.id,
        title: "To Delete",
        position: 0,
        type: "ACKNOWLEDGEMENT",
      });
      createdTaskIds.push(task.id);

      await taskService.softDelete(task.id, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const deleteEntry = entries.find((e) => e.eventType === "task.deleted");

      expect(deleteEntry).toBeDefined();
      expect(deleteEntry!.taskId).toBe(task.id);
      createdAuditLogIds.push(deleteEntry!.id);
    });
  });

  describe("Member with audit logging", () => {
    it("should log workspace.member_added when adding a member with audit context", async () => {
      const admin = await createTestUser();
      const newMember = await createTestUser();
      const auditContext = createAuditContext(admin.id);

      const workspace = await workspaceService.create({ name: "Member Add Test" });
      createdWorkspaceIds.push(workspace.id);

      await memberService.addMember(
        { workspaceId: workspace.id, userId: newMember.id, role: "user" },
        auditContext
      );

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const addEntry = entries.find((e) => e.eventType === "workspace.member_added");

      expect(addEntry).toBeDefined();
      expect(addEntry!.actorId).toBe(admin.id);
      expect(addEntry!.metadata).toEqual({ memberId: newMember.id, role: "user" });
      createdAuditLogIds.push(addEntry!.id);
    });

    it("should log workspace.member_removed when removing a member with audit context", async () => {
      const admin = await createTestUser();
      const member = await createTestUser();
      const auditContext = createAuditContext(admin.id);

      const workspace = await workspaceService.create({ name: "Member Remove Test" });
      createdWorkspaceIds.push(workspace.id);

      await memberService.addMember({
        workspaceId: workspace.id,
        userId: member.id,
        role: "user",
      });

      await memberService.removeMember(workspace.id, member.id, auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const removeEntry = entries.find((e) => e.eventType === "workspace.member_removed");

      expect(removeEntry).toBeDefined();
      expect(removeEntry!.actorId).toBe(admin.id);
      expect(removeEntry!.metadata).toEqual({ memberId: member.id });
      createdAuditLogIds.push(removeEntry!.id);
    });

    it("should log workspace.member_role_changed when updating a member role with audit context", async () => {
      const admin = await createTestUser();
      const member = await createTestUser();
      const auditContext = createAuditContext(admin.id);

      const workspace = await workspaceService.create({ name: "Role Change Test" });
      createdWorkspaceIds.push(workspace.id);

      await memberService.addMember({
        workspaceId: workspace.id,
        userId: member.id,
        role: "user",
      });

      await memberService.updateRole(workspace.id, member.id, "admin", auditContext);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);
      const roleEntry = entries.find((e) => e.eventType === "workspace.member_role_changed");

      expect(roleEntry).toBeDefined();
      expect(roleEntry!.metadata).toEqual({
        memberId: member.id,
        fromRole: "user",
        toRole: "admin",
      });
      createdAuditLogIds.push(roleEntry!.id);
    });
  });

  describe("Without audit context", () => {
    it("should not log when audit context is not provided", async () => {
      const workspace = await workspaceService.create({ name: "No Audit Test" });
      createdWorkspaceIds.push(workspace.id);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);

      expect(entries.length).toBe(0);
    });
  });
});
