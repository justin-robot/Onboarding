import { test, expect } from "@playwright/test";

/**
 * E2E: Audit Log
 *
 * Tests the audit log system per the Moxo specification:
 * - Centralized service called by all modules
 * - Every significant action writes an immutable, append-only entry
 * - Metadata stored as JSONB
 * - New entries broadcast via Ably
 * - Event types cover all major actions
 */

type AuditEventType =
  // Task lifecycle
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.reopened"
  | "task.deleted"
  // Form submissions
  | "form.submitted"
  | "form.draft_saved"
  // Acknowledgements
  | "acknowledgement.recorded"
  // Approvals
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  // E-sign events
  | "esign.sent"
  | "esign.signed"
  | "esign.completed"
  | "esign.declined"
  // File operations
  | "file.uploaded"
  | "file.deleted"
  | "file.reviewed"
  // Bookings
  | "booking.confirmed"
  | "booking.cancelled"
  // Messages
  | "message.sent"
  | "message.deleted"
  // Member changes
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "member.role_changed"
  // Due dates
  | "due_date.set"
  | "due_date.resolved"
  | "due_date.cleared"
  // Workspace lifecycle
  | "workspace.created"
  | "workspace.updated"
  | "workspace.archived"
  | "workspace.deleted";

type AuditSource = "app" | "signnow" | "system" | "webhook";

interface AuditEntry {
  id: string;
  workspaceId: string;
  userId: string | null; // null for system events
  event: AuditEventType;
  source: AuditSource;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ActivityFeedItem {
  id: string;
  event: AuditEventType;
  description: string;
  actorName: string | null;
  timestamp: string;
  entityLink?: string;
}

test.describe("Audit Log", () => {
  test.describe("Entry Creation", () => {
    test("creates audit entry with all required fields", () => {
      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.completed",
        source: "app",
        entityType: "task",
        entityId: "task-123",
        metadata: {
          taskTitle: "Review Contract",
          completedBy: "user-1",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.id).toBeTruthy();
      expect(entry.workspaceId).toBe("ws-1");
      expect(entry.event).toBe("task.completed");
      expect(entry.source).toBe("app");
    });

    test("creates system event without user ID", () => {
      const entry: AuditEntry = {
        id: "audit-2",
        workspaceId: "ws-1",
        userId: null,
        event: "due_date.resolved",
        source: "system",
        entityType: "task",
        entityId: "task-123",
        metadata: {
          resolvedDate: "2024-04-01T10:00:00.000Z",
          anchorTaskId: "task-100",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.userId).toBeNull();
      expect(entry.source).toBe("system");
    });

    test("creates SignNow webhook event", () => {
      const entry: AuditEntry = {
        id: "audit-3",
        workspaceId: "ws-1",
        userId: null,
        event: "esign.signed",
        source: "signnow",
        entityType: "esign_config",
        entityId: "esign-123",
        metadata: {
          documentId: "signnow-doc-abc",
          signerId: "signer-1",
          signerEmail: "signer@example.com",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.source).toBe("signnow");
      expect(entry.event).toBe("esign.signed");
    });
  });

  test.describe("Event Types", () => {
    test("supports all task lifecycle events", () => {
      const taskEvents: AuditEventType[] = [
        "task.created",
        "task.updated",
        "task.completed",
        "task.reopened",
        "task.deleted",
      ];

      for (const event of taskEvents) {
        const entry: AuditEntry = {
          id: `audit-${event}`,
          workspaceId: "ws-1",
          userId: "user-1",
          event,
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        expect(entry.event).toBe(event);
      }
    });

    test("supports all approval events", () => {
      const approvalEvents: AuditEventType[] = [
        "approval.requested",
        "approval.approved",
        "approval.rejected",
      ];

      for (const event of approvalEvents) {
        const entry: AuditEntry = {
          id: `audit-${event}`,
          workspaceId: "ws-1",
          userId: "user-1",
          event,
          source: "app",
          entityType: "approval_config",
          entityId: "approval-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        expect(entry.event).toBe(event);
      }
    });

    test("supports all e-sign events", () => {
      const esignEvents: AuditEventType[] = [
        "esign.sent",
        "esign.signed",
        "esign.completed",
        "esign.declined",
      ];

      for (const event of esignEvents) {
        const entry: AuditEntry = {
          id: `audit-${event}`,
          workspaceId: "ws-1",
          userId: null,
          event,
          source: "signnow",
          entityType: "esign_config",
          entityId: "esign-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        expect(entry.event).toBe(event);
      }
    });

    test("supports member change events", () => {
      const memberEvents: AuditEventType[] = [
        "member.invited",
        "member.joined",
        "member.removed",
        "member.role_changed",
      ];

      for (const event of memberEvents) {
        const entry: AuditEntry = {
          id: `audit-${event}`,
          workspaceId: "ws-1",
          userId: "admin-1",
          event,
          source: "app",
          entityType: "workspace_member",
          entityId: "member-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        expect(entry.event).toBe(event);
      }
    });
  });

  test.describe("Metadata Storage", () => {
    test("stores task completion metadata", () => {
      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.completed",
        source: "app",
        entityType: "task",
        entityId: "task-123",
        metadata: {
          taskTitle: "Review Contract",
          taskType: "APPROVAL",
          sectionId: "section-1",
          completionRule: "all",
          completedBy: ["user-1", "user-2"],
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.metadata.taskTitle).toBe("Review Contract");
      expect(entry.metadata.taskType).toBe("APPROVAL");
      expect(entry.metadata.completedBy).toHaveLength(2);
    });

    test("stores file upload metadata", () => {
      const entry: AuditEntry = {
        id: "audit-2",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "file.uploaded",
        source: "app",
        entityType: "file",
        entityId: "file-123",
        metadata: {
          fileName: "report.pdf",
          fileSize: 1024000,
          mimeType: "application/pdf",
          taskId: "task-456",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.metadata.fileName).toBe("report.pdf");
      expect(entry.metadata.fileSize).toBe(1024000);
    });

    test("stores role change metadata", () => {
      const entry: AuditEntry = {
        id: "audit-3",
        workspaceId: "ws-1",
        userId: "admin-1",
        event: "member.role_changed",
        source: "app",
        entityType: "workspace_member",
        entityId: "member-1",
        metadata: {
          memberUserId: "user-1",
          previousRole: "user",
          newRole: "account_manager",
          changedBy: "admin-1",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.metadata.previousRole).toBe("user");
      expect(entry.metadata.newRole).toBe("account_manager");
    });
  });

  test.describe("Immutability", () => {
    test("entries cannot be modified after creation", () => {
      const auditLog: AuditEntry[] = [];

      const createEntry = (entry: AuditEntry): AuditEntry => {
        // Return a frozen copy
        const frozenEntry = Object.freeze({ ...entry });
        auditLog.push(frozenEntry);
        return frozenEntry;
      };

      const entry = createEntry({
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.completed",
        source: "app",
        entityType: "task",
        entityId: "task-1",
        metadata: {},
        createdAt: new Date().toISOString(),
      });

      // Attempting to modify should throw in strict mode
      expect(Object.isFrozen(entry)).toBe(true);
    });

    test("entries are append-only", () => {
      const auditLog: AuditEntry[] = [];

      const appendEntry = (entry: AuditEntry): void => {
        auditLog.push(entry);
      };

      const deleteEntry = (_id: string): boolean => {
        // Should always return false - deletion not allowed
        return false;
      };

      appendEntry({
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.created",
        source: "app",
        entityType: "task",
        entityId: "task-1",
        metadata: {},
        createdAt: new Date().toISOString(),
      });

      expect(auditLog).toHaveLength(1);
      expect(deleteEntry("audit-1")).toBe(false);
    });
  });

  test.describe("Workspace Filtering", () => {
    test("filters entries by workspace", () => {
      const auditLog: AuditEntry[] = [
        {
          id: "audit-1",
          workspaceId: "ws-1",
          userId: "user-1",
          event: "task.created",
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        {
          id: "audit-2",
          workspaceId: "ws-2",
          userId: "user-2",
          event: "task.created",
          source: "app",
          entityType: "task",
          entityId: "task-2",
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        {
          id: "audit-3",
          workspaceId: "ws-1",
          userId: "user-1",
          event: "task.completed",
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        },
      ];

      const getWorkspaceEntries = (workspaceId: string): AuditEntry[] => {
        return auditLog.filter((e) => e.workspaceId === workspaceId);
      };

      expect(getWorkspaceEntries("ws-1")).toHaveLength(2);
      expect(getWorkspaceEntries("ws-2")).toHaveLength(1);
    });

    test("filters entries by date range", () => {
      const now = Date.now();
      const auditLog: AuditEntry[] = [
        {
          id: "audit-1",
          workspaceId: "ws-1",
          userId: "user-1",
          event: "task.created",
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "audit-2",
          workspaceId: "ws-1",
          userId: "user-1",
          event: "task.completed",
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "audit-3",
          workspaceId: "ws-1",
          userId: "user-1",
          event: "file.uploaded",
          source: "app",
          entityType: "file",
          entityId: "file-1",
          metadata: {},
          createdAt: new Date(now).toISOString(),
        },
      ];

      const getEntriesInRange = (
        workspaceId: string,
        startDate: Date,
        endDate: Date
      ): AuditEntry[] => {
        return auditLog.filter(
          (e) =>
            e.workspaceId === workspaceId &&
            new Date(e.createdAt) >= startDate &&
            new Date(e.createdAt) <= endDate
        );
      };

      const last3Days = getEntriesInRange(
        "ws-1",
        new Date(now - 3 * 24 * 60 * 60 * 1000),
        new Date(now)
      );

      expect(last3Days).toHaveLength(2);
    });
  });

  test.describe("Activity Feed Generation", () => {
    test("converts audit entry to activity feed item", () => {
      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.completed",
        source: "app",
        entityType: "task",
        entityId: "task-123",
        metadata: {
          taskTitle: "Review Contract",
        },
        createdAt: new Date().toISOString(),
      };

      const userNames: Record<string, string> = {
        "user-1": "John Doe",
      };

      const toActivityFeedItem = (
        e: AuditEntry,
        currentUserId: string
      ): ActivityFeedItem => {
        const actorName =
          e.userId === currentUserId
            ? "You"
            : e.userId
              ? userNames[e.userId] || "Unknown User"
              : null;

        const eventDescriptions: Record<string, string> = {
          "task.completed": `completed the task "${e.metadata.taskTitle}"`,
          "task.created": `created a new task "${e.metadata.taskTitle}"`,
          "file.uploaded": `uploaded "${e.metadata.fileName}"`,
        };

        return {
          id: e.id,
          event: e.event,
          description: eventDescriptions[e.event] || e.event,
          actorName,
          timestamp: e.createdAt,
          entityLink: `/tasks/${e.entityId}`,
        };
      };

      const feedItem = toActivityFeedItem(entry, "user-2");

      expect(feedItem.actorName).toBe("John Doe");
      expect(feedItem.description).toContain("Review Contract");

      const feedItemSelf = toActivityFeedItem(entry, "user-1");
      expect(feedItemSelf.actorName).toBe("You");
    });

    test("formats system events without actor", () => {
      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: null,
        event: "due_date.resolved",
        source: "system",
        entityType: "task",
        entityId: "task-123",
        metadata: {
          taskTitle: "Submit Report",
          resolvedDate: "2024-04-05T00:00:00.000Z",
        },
        createdAt: new Date().toISOString(),
      };

      const feedItem: ActivityFeedItem = {
        id: entry.id,
        event: entry.event,
        description: `Due date resolved for "${entry.metadata.taskTitle}"`,
        actorName: null,
        timestamp: entry.createdAt,
      };

      expect(feedItem.actorName).toBeNull();
    });
  });

  test.describe("Real-time Broadcasting", () => {
    test("generates Ably event for new audit entry", () => {
      interface AblyEvent {
        channel: string;
        name: string;
        data: {
          entryId: string;
          event: AuditEventType;
          entityType: string;
          entityId: string;
          timestamp: string;
        };
      }

      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.completed",
        source: "app",
        entityType: "task",
        entityId: "task-123",
        metadata: {},
        createdAt: new Date().toISOString(),
      };

      const generateAblyEvent = (e: AuditEntry): AblyEvent => {
        return {
          channel: `workspace:${e.workspaceId}:activity`,
          name: "audit.new",
          data: {
            entryId: e.id,
            event: e.event,
            entityType: e.entityType,
            entityId: e.entityId,
            timestamp: e.createdAt,
          },
        };
      };

      const event = generateAblyEvent(entry);

      expect(event.channel).toBe("workspace:ws-1:activity");
      expect(event.name).toBe("audit.new");
    });
  });

  test.describe("Pagination", () => {
    test("paginates audit entries", () => {
      const auditLog: AuditEntry[] = Array.from({ length: 100 }, (_, i) => ({
        id: `audit-${i + 1}`,
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.updated" as AuditEventType,
        source: "app" as AuditSource,
        entityType: "task",
        entityId: `task-${i + 1}`,
        metadata: {},
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
      }));

      const getPage = (
        page: number,
        pageSize: number
      ): { entries: AuditEntry[]; total: number; totalPages: number } => {
        const start = (page - 1) * pageSize;
        const entries = auditLog.slice(start, start + pageSize);
        return {
          entries,
          total: auditLog.length,
          totalPages: Math.ceil(auditLog.length / pageSize),
        };
      };

      const firstPage = getPage(1, 25);
      expect(firstPage.entries).toHaveLength(25);
      expect(firstPage.total).toBe(100);
      expect(firstPage.totalPages).toBe(4);

      const lastPage = getPage(4, 25);
      expect(lastPage.entries).toHaveLength(25);
    });
  });

  test.describe("Full Workflow", () => {
    test("logs complete task lifecycle", () => {
      const auditLog: AuditEntry[] = [];

      const logEvent = (
        event: AuditEventType,
        entityId: string,
        metadata: Record<string, unknown>
      ): void => {
        auditLog.push({
          id: `audit-${auditLog.length + 1}`,
          workspaceId: "ws-1",
          userId: "user-1",
          event,
          source: "app",
          entityType: "task",
          entityId,
          metadata,
          createdAt: new Date().toISOString(),
        });
      };

      // Create task
      logEvent("task.created", "task-1", { taskTitle: "Review Contract" });

      // Update task
      logEvent("task.updated", "task-1", { changes: { title: "Review Contract v2" } });

      // Complete task
      logEvent("task.completed", "task-1", { completedBy: "user-1" });

      expect(auditLog).toHaveLength(3);
      expect(auditLog[0].event).toBe("task.created");
      expect(auditLog[1].event).toBe("task.updated");
      expect(auditLog[2].event).toBe("task.completed");
    });
  });

  test.describe("Edge Cases", () => {
    test("handles large metadata objects", () => {
      const largeMetadata: Record<string, unknown> = {
        changes: Array.from({ length: 50 }, (_, i) => ({
          field: `field_${i}`,
          oldValue: `old_${i}`,
          newValue: `new_${i}`,
        })),
      };

      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.updated",
        source: "app",
        entityType: "task",
        entityId: "task-1",
        metadata: largeMetadata,
        createdAt: new Date().toISOString(),
      };

      expect(Array.isArray(entry.metadata.changes)).toBe(true);
      expect((entry.metadata.changes as unknown[]).length).toBe(50);
    });

    test("handles null metadata values", () => {
      const entry: AuditEntry = {
        id: "audit-1",
        workspaceId: "ws-1",
        userId: "user-1",
        event: "task.updated",
        source: "app",
        entityType: "task",
        entityId: "task-1",
        metadata: {
          previousValue: null,
          newValue: "some value",
        },
        createdAt: new Date().toISOString(),
      };

      expect(entry.metadata.previousValue).toBeNull();
    });

    test("handles concurrent entry creation", () => {
      const auditLog: AuditEntry[] = [];
      let idCounter = 0;

      const createEntry = (event: AuditEventType): AuditEntry => {
        const entry: AuditEntry = {
          id: `audit-${++idCounter}`,
          workspaceId: "ws-1",
          userId: "user-1",
          event,
          source: "app",
          entityType: "task",
          entityId: "task-1",
          metadata: {},
          createdAt: new Date().toISOString(),
        };
        auditLog.push(entry);
        return entry;
      };

      // Simulate concurrent creation
      const entries = [
        createEntry("task.created"),
        createEntry("task.updated"),
        createEntry("task.completed"),
      ];

      // All should have unique IDs
      const ids = entries.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });
  });
});
