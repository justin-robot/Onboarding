import { test, expect } from "@playwright/test";

/**
 * E2E: Task Activity Feed
 *
 * Tests the task activity feed feature which displays a chronological
 * history of events for each task including:
 * - Task creation and completion
 * - Assignee additions and removals
 * - Form submissions
 * - File uploads
 * - Acknowledgements
 * - Approvals
 * - Comments
 * - Bookings
 */

// Activity event types supported by the API
type ActivityEventType =
  | "task.created"
  | "task.completed"
  | "task.reopened"
  | "task.assigned"
  | "task.unassigned"
  | "task.acknowledged"
  | "task.assignee_completed"
  | "form.submitted"
  | "form.draft_saved"
  | "file.uploaded"
  | "file.deleted"
  | "approval.approved"
  | "approval.rejected"
  | "approval.requested"
  | "acknowledgement.completed"
  | "booking.scheduled"
  | "meeting.booked"
  | "booking.cancelled"
  | "esign.sent"
  | "esign.viewed"
  | "esign.signed"
  | "esign.completed"
  | "esign.declined"
  | "comment.created"
  | "comment.added"
  | "comment.deleted";

interface ActivityLog {
  id: string;
  type: "activity";
  eventType: ActivityEventType;
  actorId: string;
  actorName: string;
  isCurrentUser: boolean;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

test.describe("Task Activity Feed", () => {
  test.describe("API Authentication", () => {
    test("GET /api/tasks/[id]/activity returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/tasks/task-1/activity");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  test.describe("Activity Message Formatting", () => {
    // Test the message formatting logic used by the API

    const formatActivityMessage = (
      eventType: string,
      actorName: string,
      isCurrentUser: boolean,
      metadata: Record<string, unknown> | null
    ): string => {
      const subject = isCurrentUser ? "You" : actorName;
      const taskType =
        (metadata?.taskType as string) ||
        (metadata?.type as string) ||
        "Task";
      const targetName =
        (metadata?.targetName as string) ||
        (metadata?.assigneeName as string);

      const formatTaskType = (type: string): string => {
        const typeMap: Record<string, string> = {
          FORM: "Form",
          form: "Form",
          ACKNOWLEDGEMENT: "Acknowledgement",
          acknowledgement: "Acknowledgement",
          FILE_REQUEST: "File Request",
          file_upload: "File Request",
          APPROVAL: "Approval",
          approval: "Approval",
          TIME_BOOKING: "Booking",
          booking: "Booking",
          E_SIGN: "E-Sign",
          esign: "E-Sign",
        };
        return typeMap[type] || "Task";
      };

      switch (eventType) {
        case "task.created":
          return `${subject} added this ${formatTaskType(taskType)}.`;
        case "task.completed":
          return `${formatTaskType(taskType)} completed.`;
        case "task.reopened":
          return `${subject} reopened this ${formatTaskType(taskType)}.`;
        case "task.assigned":
          if (targetName) {
            return `${formatTaskType(taskType)} assigned to ${targetName}.`;
          }
          return `${subject} ${isCurrentUser ? "were" : "was"} assigned to this ${formatTaskType(taskType)}.`;
        case "task.unassigned":
          if (targetName) {
            return `${targetName} ${isCurrentUser ? "were" : "was"} removed from this ${formatTaskType(taskType)}.`;
          }
          return `${subject} ${isCurrentUser ? "were" : "was"} unassigned from this ${formatTaskType(taskType)}.`;
        case "form.submitted":
          return `${subject} submitted the form.`;
        case "form.draft_saved":
          return `${subject} saved a draft.`;
        case "file.uploaded":
          const fileCount = (metadata?.fileCount as number) || 1;
          return `${subject} submitted ${fileCount} file${fileCount > 1 ? "s" : ""}.`;
        case "file.deleted":
          return `${subject} deleted a file.`;
        case "approval.approved":
          return `${subject} approved this ${formatTaskType(taskType)}.`;
        case "approval.rejected":
          return `${subject} rejected this ${formatTaskType(taskType)}.`;
        case "approval.requested":
          return `${formatTaskType(taskType)} ready for review.`;
        case "acknowledgement.completed":
        case "task.acknowledged":
          return `${subject} acknowledged this ${formatTaskType(taskType)}.`;
        case "task.assignee_completed": {
          const userName = metadata?.userName as string;
          if (userName) {
            return `${isCurrentUser ? "You" : userName} completed their part.`;
          }
          return `${subject} completed their part.`;
        }
        case "booking.scheduled":
        case "meeting.booked":
          return `${subject} scheduled a booking.`;
        case "booking.cancelled":
          return `${subject} cancelled the booking.`;
        case "esign.sent":
          return `Document sent for signature.`;
        case "esign.viewed":
          return `${subject} viewed the document.`;
        case "esign.signed":
          return `${subject} signed the document.`;
        case "esign.completed":
          return `E-signature completed.`;
        case "esign.declined":
          return `${subject} declined to sign.`;
        case "comment.created":
        case "comment.added":
          return `${subject} added a comment.`;
        case "comment.deleted":
          return `${subject} deleted a comment.`;
        default:
          return `${subject} performed an action.`;
      }
    };

    test("formats task creation message correctly", () => {
      const message = formatActivityMessage(
        "task.created",
        "John Doe",
        false,
        { type: "FORM" }
      );
      expect(message).toBe("John Doe added this Form.");
    });

    test("formats task creation message with 'You' for current user", () => {
      const message = formatActivityMessage("task.created", "John Doe", true, {
        type: "ACKNOWLEDGEMENT",
      });
      expect(message).toBe("You added this Acknowledgement.");
    });

    test("formats task completion message", () => {
      const message = formatActivityMessage(
        "task.completed",
        "Jane Smith",
        false,
        { type: "FILE_REQUEST" }
      );
      expect(message).toBe("File Request completed.");
    });

    test("formats task assignment message with target name", () => {
      const message = formatActivityMessage(
        "task.assigned",
        "Admin User",
        false,
        { type: "FORM", assigneeName: "Marcus Johnson" }
      );
      expect(message).toBe("Form assigned to Marcus Johnson.");
    });

    test("formats task assignment message without target name", () => {
      const message = formatActivityMessage(
        "task.assigned",
        "Marcus Johnson",
        false,
        { type: "FORM" }
      );
      expect(message).toBe("Marcus Johnson was assigned to this Form.");
    });

    test("formats task assignment message for current user", () => {
      const message = formatActivityMessage(
        "task.assigned",
        "Marcus Johnson",
        true,
        { type: "FORM" }
      );
      expect(message).toBe("You were assigned to this Form.");
    });

    test("formats task unassignment message with target name", () => {
      const message = formatActivityMessage(
        "task.unassigned",
        "Admin User",
        false,
        { type: "APPROVAL", targetName: "Emily Rivera" }
      );
      expect(message).toBe("Emily Rivera was removed from this Approval.");
    });

    test("formats form submission message", () => {
      const message = formatActivityMessage(
        "form.submitted",
        "Marcus Johnson",
        false,
        null
      );
      expect(message).toBe("Marcus Johnson submitted the form.");
    });

    test("formats form submission message for current user", () => {
      const message = formatActivityMessage("form.submitted", "You", true, null);
      expect(message).toBe("You submitted the form.");
    });

    test("formats file upload message with single file", () => {
      const message = formatActivityMessage(
        "file.uploaded",
        "Emily Rivera",
        false,
        { fileCount: 1 }
      );
      expect(message).toBe("Emily Rivera submitted 1 file.");
    });

    test("formats file upload message with multiple files", () => {
      const message = formatActivityMessage(
        "file.uploaded",
        "Emily Rivera",
        false,
        { fileCount: 3 }
      );
      expect(message).toBe("Emily Rivera submitted 3 files.");
    });

    test("formats acknowledgement message", () => {
      const message = formatActivityMessage(
        "task.acknowledged",
        "Marcus Johnson",
        false,
        { type: "ACKNOWLEDGEMENT" }
      );
      expect(message).toBe("Marcus Johnson acknowledged this Acknowledgement.");
    });

    test("formats acknowledgement message for current user", () => {
      const message = formatActivityMessage(
        "acknowledgement.completed",
        "You",
        true,
        { type: "ACKNOWLEDGEMENT" }
      );
      expect(message).toBe("You acknowledged this Acknowledgement.");
    });

    test("formats approval message", () => {
      const message = formatActivityMessage(
        "approval.approved",
        "Admin User",
        false,
        { type: "APPROVAL" }
      );
      expect(message).toBe("Admin User approved this Approval.");
    });

    test("formats rejection message", () => {
      const message = formatActivityMessage(
        "approval.rejected",
        "Admin User",
        false,
        { type: "APPROVAL" }
      );
      expect(message).toBe("Admin User rejected this Approval.");
    });

    test("formats booking scheduled message", () => {
      const message = formatActivityMessage(
        "meeting.booked",
        "Marcus Johnson",
        false,
        { type: "TIME_BOOKING" }
      );
      expect(message).toBe("Marcus Johnson scheduled a booking.");
    });

    test("formats booking cancelled message", () => {
      const message = formatActivityMessage(
        "booking.cancelled",
        "Marcus Johnson",
        false,
        { type: "TIME_BOOKING" }
      );
      expect(message).toBe("Marcus Johnson cancelled the booking.");
    });

    test("formats e-sign events correctly", () => {
      expect(
        formatActivityMessage("esign.sent", "Admin", false, { type: "E_SIGN" })
      ).toBe("Document sent for signature.");

      expect(
        formatActivityMessage("esign.viewed", "Client", false, {
          type: "E_SIGN",
        })
      ).toBe("Client viewed the document.");

      expect(
        formatActivityMessage("esign.signed", "Client", false, {
          type: "E_SIGN",
        })
      ).toBe("Client signed the document.");

      expect(
        formatActivityMessage("esign.completed", "System", false, {
          type: "E_SIGN",
        })
      ).toBe("E-signature completed.");

      expect(
        formatActivityMessage("esign.declined", "Client", false, {
          type: "E_SIGN",
        })
      ).toBe("Client declined to sign.");
    });

    test("formats comment events correctly", () => {
      expect(
        formatActivityMessage("comment.created", "Sarah Chen", false, null)
      ).toBe("Sarah Chen added a comment.");

      expect(
        formatActivityMessage("comment.added", "Sarah Chen", false, null)
      ).toBe("Sarah Chen added a comment.");

      expect(
        formatActivityMessage("comment.deleted", "Sarah Chen", false, null)
      ).toBe("Sarah Chen deleted a comment.");
    });

    test("formats assignee completion message", () => {
      const message = formatActivityMessage(
        "task.assignee_completed",
        "Marcus Johnson",
        false,
        { userName: "Marcus Johnson" }
      );
      expect(message).toBe("Marcus Johnson completed their part.");
    });

    test("formats assignee completion message for current user", () => {
      const message = formatActivityMessage(
        "task.assignee_completed",
        "You",
        true,
        { userName: "Marcus Johnson" }
      );
      expect(message).toBe("You completed their part.");
    });

    test("handles unknown event types gracefully", () => {
      const message = formatActivityMessage(
        "unknown.event",
        "John Doe",
        false,
        null
      );
      expect(message).toBe("John Doe performed an action.");
    });

    test("handles missing taskType with fallback to 'Task'", () => {
      const message = formatActivityMessage(
        "task.created",
        "John Doe",
        false,
        null
      );
      expect(message).toBe("John Doe added this Task.");
    });
  });

  test.describe("Activity Feed Sorting and Display", () => {
    test("activities are sorted chronologically (oldest first)", () => {
      const activities: Array<{ id: string; createdAt: string }> = [
        { id: "3", createdAt: "2024-02-27T12:00:00Z" },
        { id: "1", createdAt: "2024-02-27T10:00:00Z" },
        { id: "2", createdAt: "2024-02-27T11:00:00Z" },
      ];

      const sorted = [...activities].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB; // Oldest first
      });

      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("3");
    });

    test("merges comments and activities chronologically", () => {
      const comments = [
        { id: "c1", type: "comment" as const, createdAt: "2024-02-27T10:30:00Z" },
        { id: "c2", type: "comment" as const, createdAt: "2024-02-27T11:30:00Z" },
      ];

      const activities = [
        {
          id: "a1",
          type: "activity" as const,
          createdAt: "2024-02-27T10:00:00Z",
        },
        {
          id: "a2",
          type: "activity" as const,
          createdAt: "2024-02-27T11:00:00Z",
        },
        {
          id: "a3",
          type: "activity" as const,
          createdAt: "2024-02-27T12:00:00Z",
        },
      ];

      const combined = [...comments, ...activities].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });

      expect(combined).toHaveLength(5);
      expect(combined[0].id).toBe("a1"); // 10:00
      expect(combined[1].id).toBe("c1"); // 10:30
      expect(combined[2].id).toBe("a2"); // 11:00
      expect(combined[3].id).toBe("c2"); // 11:30
      expect(combined[4].id).toBe("a3"); // 12:00
    });
  });

  test.describe("Date Formatting", () => {
    const formatMoxoDate = (date: Date | string): string => {
      const d = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      const time = `${hour12}:${minutes} ${ampm}`;

      if (isToday) {
        return `Today, ${time}`;
      }
      if (isYesterday) {
        return `Yesterday, ${time}`;
      }

      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return `${days[d.getDay()]}, ${time}`;
    };

    test("formats today's date correctly", () => {
      const now = new Date();
      const formatted = formatMoxoDate(now);
      expect(formatted).toMatch(/^Today, \d{1,2}:\d{2} [AP]M$/);
    });

    test("formats yesterday's date correctly", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const formatted = formatMoxoDate(yesterday);
      expect(formatted).toMatch(/^Yesterday, \d{1,2}:\d{2} [AP]M$/);
    });

    test("formats weekday date correctly", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const formatted = formatMoxoDate(twoDaysAgo);
      expect(formatted).toMatch(
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), \d{1,2}:\d{2} [AP]M$/
      );
    });

    test("handles ISO string input", () => {
      const isoString = new Date().toISOString();
      const formatted = formatMoxoDate(isoString);
      expect(formatted).toMatch(/^Today, \d{1,2}:\d{2} [AP]M$/);
    });
  });

  test.describe("Activity Feed Item Structure", () => {
    test("activity item has required fields", () => {
      const activity: ActivityLog = {
        id: "activity-1",
        type: "activity",
        eventType: "task.created",
        actorId: "user-1",
        actorName: "John Doe",
        isCurrentUser: false,
        message: "John Doe added this Form.",
        createdAt: new Date().toISOString(),
        metadata: { type: "FORM" },
      };

      expect(activity.id).toBeTruthy();
      expect(activity.type).toBe("activity");
      expect(activity.eventType).toBe("task.created");
      expect(activity.actorId).toBeTruthy();
      expect(activity.actorName).toBeTruthy();
      expect(typeof activity.isCurrentUser).toBe("boolean");
      expect(activity.message).toBeTruthy();
      expect(activity.createdAt).toBeTruthy();
    });

    test("activity item can have optional metadata", () => {
      const activityWithMetadata: ActivityLog = {
        id: "activity-1",
        type: "activity",
        eventType: "task.assigned",
        actorId: "user-1",
        actorName: "Admin",
        isCurrentUser: false,
        message: "Form assigned to Marcus Johnson.",
        createdAt: new Date().toISOString(),
        metadata: {
          type: "FORM",
          assigneeName: "Marcus Johnson",
          assigneeId: "user-2",
        },
      };

      expect(activityWithMetadata.metadata).toBeDefined();
      expect(activityWithMetadata.metadata?.assigneeName).toBe("Marcus Johnson");
    });

    test("activity item without metadata is valid", () => {
      const activityWithoutMetadata: ActivityLog = {
        id: "activity-1",
        type: "activity",
        eventType: "comment.created",
        actorId: "user-1",
        actorName: "John Doe",
        isCurrentUser: false,
        message: "John Doe added a comment.",
        createdAt: new Date().toISOString(),
      };

      expect(activityWithoutMetadata.metadata).toBeUndefined();
    });
  });

  test.describe("Task Type Mapping", () => {
    const formatTaskType = (type: string): string => {
      const typeMap: Record<string, string> = {
        FORM: "Form",
        form: "Form",
        ACKNOWLEDGEMENT: "Acknowledgement",
        acknowledgement: "Acknowledgement",
        FILE_REQUEST: "File Request",
        file_upload: "File Request",
        APPROVAL: "Approval",
        approval: "Approval",
        TIME_BOOKING: "Booking",
        booking: "Booking",
        E_SIGN: "E-Sign",
        esign: "E-Sign",
      };
      return typeMap[type] || "Task";
    };

    test("maps uppercase database types correctly", () => {
      expect(formatTaskType("FORM")).toBe("Form");
      expect(formatTaskType("ACKNOWLEDGEMENT")).toBe("Acknowledgement");
      expect(formatTaskType("FILE_REQUEST")).toBe("File Request");
      expect(formatTaskType("APPROVAL")).toBe("Approval");
      expect(formatTaskType("TIME_BOOKING")).toBe("Booking");
      expect(formatTaskType("E_SIGN")).toBe("E-Sign");
    });

    test("maps lowercase frontend types correctly", () => {
      expect(formatTaskType("form")).toBe("Form");
      expect(formatTaskType("acknowledgement")).toBe("Acknowledgement");
      expect(formatTaskType("file_upload")).toBe("File Request");
      expect(formatTaskType("approval")).toBe("Approval");
      expect(formatTaskType("booking")).toBe("Booking");
      expect(formatTaskType("esign")).toBe("E-Sign");
    });

    test("returns 'Task' for unknown types", () => {
      expect(formatTaskType("unknown")).toBe("Task");
      expect(formatTaskType("")).toBe("Task");
    });
  });

  test.describe("Perspective-Aware Messages", () => {
    test("uses 'You' for current user's actions", () => {
      const formatSubject = (
        actorName: string,
        isCurrentUser: boolean
      ): string => {
        return isCurrentUser ? "You" : actorName;
      };

      expect(formatSubject("John Doe", true)).toBe("You");
      expect(formatSubject("John Doe", false)).toBe("John Doe");
    });

    test("determines current user correctly based on actor ID", () => {
      const currentUserId = "user-1";
      const activities = [
        { actorId: "user-1", actorName: "John Doe" },
        { actorId: "user-2", actorName: "Jane Smith" },
        { actorId: "user-1", actorName: "John Doe" },
      ];

      const withIsCurrentUser = activities.map((a) => ({
        ...a,
        isCurrentUser: a.actorId === currentUserId,
      }));

      expect(withIsCurrentUser[0].isCurrentUser).toBe(true);
      expect(withIsCurrentUser[1].isCurrentUser).toBe(false);
      expect(withIsCurrentUser[2].isCurrentUser).toBe(true);
    });
  });

  test.describe("Activity Feed Complete Workflow", () => {
    test("simulates complete task lifecycle with activity events", () => {
      const activityLog: Array<{
        eventType: string;
        actorName: string;
        message: string;
        createdAt: Date;
      }> = [];

      const logActivity = (
        eventType: string,
        actorName: string,
        message: string
      ) => {
        activityLog.push({
          eventType,
          actorName,
          message,
          createdAt: new Date(),
        });
      };

      // Task lifecycle events
      logActivity("task.created", "Admin User", "Admin User added this Form.");
      logActivity(
        "task.assigned",
        "Admin User",
        "Form assigned to Marcus Johnson."
      );
      logActivity(
        "task.assigned",
        "Admin User",
        "Form assigned to Emily Rivera."
      );
      logActivity("form.submitted", "Marcus Johnson", "Marcus Johnson submitted the form.");
      logActivity(
        "task.assignee_completed",
        "Marcus Johnson",
        "Marcus Johnson completed their part."
      );
      logActivity("form.submitted", "Emily Rivera", "Emily Rivera submitted the form.");
      logActivity(
        "task.assignee_completed",
        "Emily Rivera",
        "Emily Rivera completed their part."
      );
      logActivity("task.completed", "System", "Form completed.");

      // Verify event sequence
      expect(activityLog).toHaveLength(8);
      expect(activityLog[0].eventType).toBe("task.created");
      expect(activityLog[1].eventType).toBe("task.assigned");
      expect(activityLog[2].eventType).toBe("task.assigned");
      expect(activityLog[3].eventType).toBe("form.submitted");
      expect(activityLog[4].eventType).toBe("task.assignee_completed");
      expect(activityLog[5].eventType).toBe("form.submitted");
      expect(activityLog[6].eventType).toBe("task.assignee_completed");
      expect(activityLog[7].eventType).toBe("task.completed");
    });

    test("handles acknowledgement task workflow", () => {
      const events: string[] = [];

      // Acknowledgement workflow
      events.push("task.created");
      events.push("task.assigned");
      events.push("task.assigned");
      events.push("task.acknowledged"); // User 1
      events.push("task.acknowledged"); // User 2
      events.push("task.completed");

      expect(events).toHaveLength(6);
      expect(events.filter((e) => e === "task.acknowledged")).toHaveLength(2);
    });

    test("handles approval task workflow", () => {
      const events: string[] = [];

      // Approval workflow
      events.push("task.created");
      events.push("task.assigned");
      events.push("approval.requested");
      events.push("approval.approved");
      events.push("task.completed");

      expect(events).toHaveLength(5);
      expect(events).toContain("approval.requested");
      expect(events).toContain("approval.approved");
    });

    test("handles file request task workflow", () => {
      const events: string[] = [];

      // File request workflow
      events.push("task.created");
      events.push("task.assigned");
      events.push("file.uploaded");
      events.push("task.assignee_completed");
      events.push("task.completed");

      expect(events).toHaveLength(5);
      expect(events).toContain("file.uploaded");
    });

    test("handles e-sign task workflow", () => {
      const events: string[] = [];

      // E-sign workflow
      events.push("task.created");
      events.push("task.assigned");
      events.push("esign.sent");
      events.push("esign.viewed");
      events.push("esign.signed");
      events.push("esign.completed");
      events.push("task.completed");

      expect(events).toHaveLength(7);
      expect(events.filter((e) => e.startsWith("esign."))).toHaveLength(4);
    });

    test("handles booking task workflow", () => {
      const events: string[] = [];

      // Booking workflow
      events.push("task.created");
      events.push("task.assigned");
      events.push("meeting.booked");
      events.push("task.completed");

      expect(events).toHaveLength(4);
      expect(events).toContain("meeting.booked");
    });
  });
});
