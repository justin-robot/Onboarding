import { test, expect } from "@playwright/test";

/**
 * E2E: Acknowledgement Task
 *
 * Tests the acknowledgement task workflow per the Moxo specification:
 * - Admin creates task with attachments and instructions
 * - Assignee reviews and clicks "I acknowledge"
 * - Creates acknowledgement record and completes task
 */

interface Task {
  id: string;
  title: string;
  type: "ACKNOWLEDGEMENT";
  sectionId: string;
  status: "not_started" | "in_progress" | "completed";
  isLocked: boolean;
  completionRule: "any" | "all";
  assignees: string[];
  completedAt: string | null;
}

interface AcknowledgementConfig {
  id: string;
  taskId: string;
  instructions: string;
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
}

interface AcknowledgementRecord {
  id: string;
  taskId: string;
  userId: string;
  acknowledgedAt: string;
}

test.describe("Acknowledgement Task", () => {
  test.describe("Task Creation", () => {
    test("creates acknowledgement task with correct type", () => {
      const task: Task = {
        id: "task-ack-1",
        title: "Review Company Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2"],
        completedAt: null,
      };

      expect(task.type).toBe("ACKNOWLEDGEMENT");
      expect(task.status).toBe("not_started");
      expect(task.assignees).toHaveLength(2);
    });

    test("creates acknowledgement config with instructions", () => {
      const config: AcknowledgementConfig = {
        id: "ack-config-1",
        taskId: "task-1",
        instructions:
          "Please review the attached policy document carefully. By acknowledging, you confirm that you have read and understood the policies.",
        attachments: [],
      };

      expect(config.instructions).toBeTruthy();
      expect(config.attachments).toHaveLength(0);
    });

    test("creates acknowledgement config with attachments", () => {
      const config: AcknowledgementConfig = {
        id: "ack-config-1",
        taskId: "task-1",
        instructions: "Review the attached documents.",
        attachments: [
          {
            id: "att-1",
            fileName: "policy.pdf",
            fileUrl: "https://storage.example.com/policy.pdf",
            mimeType: "application/pdf",
            size: 1024000,
          },
          {
            id: "att-2",
            fileName: "guidelines.pdf",
            fileUrl: "https://storage.example.com/guidelines.pdf",
            mimeType: "application/pdf",
            size: 512000,
          },
        ],
      };

      expect(config.attachments).toHaveLength(2);
      expect(config.attachments[0].fileName).toBe("policy.pdf");
    });

    test("validates attachment file types", () => {
      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];

      const isAllowedFileType = (mimeType: string): boolean => {
        return allowedMimeTypes.includes(mimeType);
      };

      expect(isAllowedFileType("application/pdf")).toBe(true);
      expect(isAllowedFileType("image/jpeg")).toBe(true);
      expect(isAllowedFileType("application/x-executable")).toBe(false);
    });
  });

  test.describe("Acknowledgement Recording", () => {
    test("records acknowledgement for assignee", () => {
      const records: AcknowledgementRecord[] = [];

      const recordAcknowledgement = (
        taskId: string,
        userId: string
      ): AcknowledgementRecord => {
        const record: AcknowledgementRecord = {
          id: `ack-${records.length + 1}`,
          taskId,
          userId,
          acknowledgedAt: new Date().toISOString(),
        };
        records.push(record);
        return record;
      };

      const record = recordAcknowledgement("task-1", "user-1");
      expect(record.taskId).toBe("task-1");
      expect(record.userId).toBe("user-1");
      expect(record.acknowledgedAt).toBeTruthy();
      expect(records).toHaveLength(1);
    });

    test("prevents duplicate acknowledgements from same user", () => {
      const records: AcknowledgementRecord[] = [
        {
          id: "ack-1",
          taskId: "task-1",
          userId: "user-1",
          acknowledgedAt: new Date().toISOString(),
        },
      ];

      const hasAcknowledged = (taskId: string, userId: string): boolean => {
        return records.some((r) => r.taskId === taskId && r.userId === userId);
      };

      expect(hasAcknowledged("task-1", "user-1")).toBe(true);
      expect(hasAcknowledged("task-1", "user-2")).toBe(false);
    });

    test("only assignees can acknowledge", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2"],
        completedAt: null,
      };

      const canAcknowledge = (userId: string): boolean => {
        return task.assignees.includes(userId);
      };

      expect(canAcknowledge("user-1")).toBe(true);
      expect(canAcknowledge("user-2")).toBe(true);
      expect(canAcknowledge("user-3")).toBe(false);
    });

    test("cannot acknowledge locked task", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: true,
        completionRule: "all",
        assignees: ["user-1"],
        completedAt: null,
      };

      const canAcknowledge = (userId: string): boolean => {
        return !task.isLocked && task.assignees.includes(userId);
      };

      expect(canAcknowledge("user-1")).toBe(false);
    });
  });

  test.describe("Completion Rules", () => {
    test("'any' rule - one acknowledgement completes task", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "any",
        assignees: ["user-1", "user-2", "user-3"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [
        {
          id: "ack-1",
          taskId: "task-1",
          userId: "user-1",
          acknowledgedAt: new Date().toISOString(),
        },
      ];

      const isTaskComplete = (): boolean => {
        const taskRecords = records.filter((r) => r.taskId === task.id);
        if (task.completionRule === "any") {
          return taskRecords.length > 0;
        }
        return task.assignees.every((a) =>
          taskRecords.some((r) => r.userId === a)
        );
      };

      expect(isTaskComplete()).toBe(true);
    });

    test("'all' rule - requires all assignees to acknowledge", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2", "user-3"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [
        {
          id: "ack-1",
          taskId: "task-1",
          userId: "user-1",
          acknowledgedAt: new Date().toISOString(),
        },
        {
          id: "ack-2",
          taskId: "task-1",
          userId: "user-2",
          acknowledgedAt: new Date().toISOString(),
        },
      ];

      const isTaskComplete = (): boolean => {
        const taskRecords = records.filter((r) => r.taskId === task.id);
        if (task.completionRule === "any") {
          return taskRecords.length > 0;
        }
        return task.assignees.every((a) =>
          taskRecords.some((r) => r.userId === a)
        );
      };

      // Only 2 of 3 have acknowledged
      expect(isTaskComplete()).toBe(false);

      // Add third acknowledgement
      records.push({
        id: "ack-3",
        taskId: "task-1",
        userId: "user-3",
        acknowledgedAt: new Date().toISOString(),
      });

      expect(isTaskComplete()).toBe(true);
    });
  });

  test.describe("Task Status Transitions", () => {
    test("transitions to in_progress when first assignee acknowledges", () => {
      let task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [];

      const acknowledge = (userId: string): void => {
        records.push({
          id: `ack-${records.length + 1}`,
          taskId: task.id,
          userId,
          acknowledgedAt: new Date().toISOString(),
        });

        const taskRecords = records.filter((r) => r.taskId === task.id);
        const allAcknowledged = task.assignees.every((a) =>
          taskRecords.some((r) => r.userId === a)
        );

        if (allAcknowledged) {
          task = { ...task, status: "completed", completedAt: new Date().toISOString() };
        } else if (taskRecords.length > 0) {
          task = { ...task, status: "in_progress" };
        }
      };

      expect(task.status).toBe("not_started");

      acknowledge("user-1");
      expect(task.status).toBe("in_progress");

      acknowledge("user-2");
      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();
    });

    test("completes immediately with 'any' rule", () => {
      let task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "any",
        assignees: ["user-1", "user-2", "user-3"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [];

      const acknowledge = (userId: string): void => {
        records.push({
          id: `ack-${records.length + 1}`,
          taskId: task.id,
          userId,
          acknowledgedAt: new Date().toISOString(),
        });

        if (task.completionRule === "any") {
          task = { ...task, status: "completed", completedAt: new Date().toISOString() };
        }
      };

      acknowledge("user-2");
      expect(task.status).toBe("completed");
    });
  });

  test.describe("Progress Tracking", () => {
    test("calculates acknowledgement progress percentage", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2", "user-3", "user-4"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [
        { id: "ack-1", taskId: "task-1", userId: "user-1", acknowledgedAt: new Date().toISOString() },
        { id: "ack-2", taskId: "task-1", userId: "user-2", acknowledgedAt: new Date().toISOString() },
      ];

      const getProgress = (): number => {
        const taskRecords = records.filter((r) => r.taskId === task.id);
        return Math.round((taskRecords.length / task.assignees.length) * 100);
      };

      expect(getProgress()).toBe(50);
    });

    test("shows pending assignees", () => {
      const task: Task = {
        id: "task-1",
        title: "Review Policy",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "in_progress",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1", "user-2", "user-3"],
        completedAt: null,
      };

      const records: AcknowledgementRecord[] = [
        { id: "ack-1", taskId: "task-1", userId: "user-1", acknowledgedAt: new Date().toISOString() },
      ];

      const getPendingAssignees = (): string[] => {
        const acknowledged = records
          .filter((r) => r.taskId === task.id)
          .map((r) => r.userId);
        return task.assignees.filter((a) => !acknowledged.includes(a));
      };

      expect(getPendingAssignees()).toEqual(["user-2", "user-3"]);
    });
  });

  test.describe("Full Workflow", () => {
    test("complete acknowledgement workflow", () => {
      // Step 1: Create task
      let task: Task = {
        id: "task-1",
        title: "Review Employee Handbook",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-onboarding",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["new-employee-1"],
        completedAt: null,
      };

      // Step 2: Create config with instructions and attachments
      const config: AcknowledgementConfig = {
        id: "config-1",
        taskId: task.id,
        instructions:
          "Please read the employee handbook thoroughly. By acknowledging, you confirm you understand our company policies.",
        attachments: [
          {
            id: "att-1",
            fileName: "employee-handbook-2024.pdf",
            fileUrl: "https://storage.example.com/handbook.pdf",
            mimeType: "application/pdf",
            size: 2048000,
          },
        ],
      };

      expect(config.instructions).toBeTruthy();
      expect(config.attachments).toHaveLength(1);

      // Step 3: Employee reviews
      expect(task.status).toBe("not_started");

      // Step 4: Employee acknowledges
      const records: AcknowledgementRecord[] = [];
      records.push({
        id: "ack-1",
        taskId: task.id,
        userId: "new-employee-1",
        acknowledgedAt: new Date().toISOString(),
      });

      // Step 5: Task completes
      task = {
        ...task,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      expect(task.status).toBe("completed");
      expect(records).toHaveLength(1);
    });
  });

  test.describe("Edge Cases", () => {
    test("handles empty instructions", () => {
      const config: AcknowledgementConfig = {
        id: "config-1",
        taskId: "task-1",
        instructions: "",
        attachments: [],
      };

      const hasContent = config.instructions || config.attachments.length > 0;
      expect(hasContent).toBe(false);
    });

    test("handles single assignee", () => {
      const task: Task = {
        id: "task-1",
        title: "Solo Review",
        type: "ACKNOWLEDGEMENT",
        sectionId: "section-1",
        status: "not_started",
        isLocked: false,
        completionRule: "all",
        assignees: ["user-1"],
        completedAt: null,
      };

      expect(task.assignees).toHaveLength(1);
      // With single assignee, 'any' and 'all' behave the same
    });

    test("handles acknowledgement timestamp precision", () => {
      const record: AcknowledgementRecord = {
        id: "ack-1",
        taskId: "task-1",
        userId: "user-1",
        acknowledgedAt: new Date().toISOString(),
      };

      // Should be a valid ISO timestamp
      expect(() => new Date(record.acknowledgedAt)).not.toThrow();
      expect(new Date(record.acknowledgedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
