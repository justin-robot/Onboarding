import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { workspaceService } from "../services/workspace";
import { sectionService } from "../services/section";
import { taskService } from "../services/task";
import { auditLogService, AuditEventType, AuditSource } from "../services/auditLog";

describe("AuditLogService", () => {
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

  // Helper to create workspace with task
  async function createTestWorkspaceWithTask() {
    const workspace = await workspaceService.create({ name: `Audit Test ${Date.now()}` });
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

  describe("logEvent", () => {
    it("should log a task.created event", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const entry = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.created",
        actorId: user.id,
        taskId: task.id,
        source: "web",
        metadata: { taskTitle: "Test Task" },
      });
      createdAuditLogIds.push(entry.id);

      expect(entry.id).toBeDefined();
      expect(entry.workspaceId).toBe(workspace.id);
      expect(entry.taskId).toBe(task.id);
      expect(entry.eventType).toBe("task.created");
      expect(entry.actorId).toBe(user.id);
      expect(entry.source).toBe("web");
      expect(entry.metadata).toEqual({ taskTitle: "Test Task" });
    });

    it("should log an event without taskId", async () => {
      const { workspace } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const entry = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "workspace.member_added",
        actorId: user.id,
        source: "web",
        metadata: { memberEmail: "new@example.com", role: "user" },
      });
      createdAuditLogIds.push(entry.id);

      expect(entry.taskId).toBeNull();
    });

    it("should log an event with IP address", async () => {
      const { workspace } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const entry = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "workspace.settings_updated",
        actorId: user.id,
        source: "web",
        ipAddress: "192.168.1.1",
      });
      createdAuditLogIds.push(entry.id);

      expect(entry.ipAddress).toBe("192.168.1.1");
    });

    it("should log events from different sources", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const sources: AuditSource[] = ["web", "api", "system", "signnow", "calendly"];

      for (const source of sources) {
        const entry = await auditLogService.logEvent({
          workspaceId: workspace.id,
          eventType: "task.updated",
          actorId: user.id,
          taskId: task.id,
          source,
        });
        createdAuditLogIds.push(entry.id);

        expect(entry.source).toBe(source);
      }
    });

    it("should serialize complex metadata correctly", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const complexMetadata = {
        changes: {
          title: { from: "Old Title", to: "New Title" },
          status: { from: "not_started", to: "in_progress" },
        },
        assignees: ["user1", "user2", "user3"],
        timestamp: "2024-01-15T10:30:00Z",
        count: 42,
      };

      const entry = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.updated",
        actorId: user.id,
        taskId: task.id,
        source: "web",
        metadata: complexMetadata,
      });
      createdAuditLogIds.push(entry.id);

      expect(entry.metadata).toEqual(complexMetadata);
    });

    it("should log various event types", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const eventTypes: AuditEventType[] = [
        "task.created",
        "task.completed",
        "task.reopened",
        "task.deleted",
        "file.uploaded",
        "approval.approved",
        "approval.rejected",
      ];

      for (const eventType of eventTypes) {
        const entry = await auditLogService.logEvent({
          workspaceId: workspace.id,
          eventType,
          actorId: user.id,
          taskId: task.id,
          source: "web",
        });
        createdAuditLogIds.push(entry.id);

        expect(entry.eventType).toBe(eventType);
      }
    });
  });

  describe("getByWorkspaceId", () => {
    it("should return all audit entries for a workspace ordered by createdAt desc", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      // Create multiple entries
      const entry1 = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.created",
        actorId: user.id,
        taskId: task.id,
        source: "web",
      });
      createdAuditLogIds.push(entry1.id);

      const entry2 = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.updated",
        actorId: user.id,
        taskId: task.id,
        source: "web",
      });
      createdAuditLogIds.push(entry2.id);

      const entries = await auditLogService.getByWorkspaceId(workspace.id);

      expect(entries.length).toBeGreaterThanOrEqual(2);
      // Should be ordered by createdAt desc (newest first)
      expect(entries[0].createdAt.getTime()).toBeGreaterThanOrEqual(entries[1].createdAt.getTime());
    });

    it("should support limit option", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        const entry = await auditLogService.logEvent({
          workspaceId: workspace.id,
          eventType: "task.updated",
          actorId: user.id,
          taskId: task.id,
          source: "web",
        });
        createdAuditLogIds.push(entry.id);
      }

      const entries = await auditLogService.getByWorkspaceId(workspace.id, { limit: 3 });

      expect(entries).toHaveLength(3);
    });
  });

  describe("getByTaskId", () => {
    it("should return all audit entries for a task", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const entry1 = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.created",
        actorId: user.id,
        taskId: task.id,
        source: "web",
      });
      createdAuditLogIds.push(entry1.id);

      const entry2 = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.completed",
        actorId: user.id,
        taskId: task.id,
        source: "web",
      });
      createdAuditLogIds.push(entry2.id);

      const entries = await auditLogService.getByTaskId(task.id);

      expect(entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getByActorId", () => {
    it("should return all audit entries by a specific actor", async () => {
      const { workspace, task } = await createTestWorkspaceWithTask();
      const user = await createTestUser();

      const entry = await auditLogService.logEvent({
        workspaceId: workspace.id,
        eventType: "task.created",
        actorId: user.id,
        taskId: task.id,
        source: "web",
      });
      createdAuditLogIds.push(entry.id);

      const entries = await auditLogService.getByActorId(user.id);

      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries.every(e => e.actorId === user.id)).toBe(true);
    });
  });
});
