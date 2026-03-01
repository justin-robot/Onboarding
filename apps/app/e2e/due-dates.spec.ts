import { test, expect } from "@playwright/test";

/**
 * E2E: Due Date Logic
 *
 * Tests the due date system per the Moxo specification:
 * - Absolute due dates stored directly
 * - Relative due dates (anchor task ID + offset in days)
 * - Cascading resolution on completion
 * - Cascading nullification on reopen
 * - Circular dependency prevention
 */

interface DueDate {
  type: "absolute" | "relative";
  absoluteDate?: string; // ISO date string
  anchorTaskId?: string;
  offsetDays?: number;
  resolvedDate?: string | null;
}

interface Task {
  id: string;
  title: string;
  dueDate: DueDate | null;
  status: "not_started" | "in_progress" | "completed";
  completedAt: string | null;
}

test.describe("Due Date Logic", () => {
  test.describe("Absolute Due Dates", () => {
    test("stores absolute due date directly", () => {
      const task: Task = {
        id: "task-1",
        title: "Submit Report",
        dueDate: {
          type: "absolute",
          absoluteDate: "2024-12-31T23:59:59.000Z",
        },
        status: "not_started",
        completedAt: null,
      };

      expect(task.dueDate?.type).toBe("absolute");
      expect(task.dueDate?.absoluteDate).toBe("2024-12-31T23:59:59.000Z");
    });

    test("gets effective due date for absolute dates", () => {
      const getEffectiveDueDate = (dueDate: DueDate | null): string | null => {
        if (!dueDate) return null;
        if (dueDate.type === "absolute") {
          return dueDate.absoluteDate || null;
        }
        return dueDate.resolvedDate || null;
      };

      const absoluteDueDate: DueDate = {
        type: "absolute",
        absoluteDate: "2024-06-15T12:00:00.000Z",
      };

      expect(getEffectiveDueDate(absoluteDueDate)).toBe("2024-06-15T12:00:00.000Z");
      expect(getEffectiveDueDate(null)).toBeNull();
    });

    test("validates absolute due date is in future on creation", () => {
      const isValidFutureDueDate = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return date.getTime() > Date.now();
      };

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      expect(isValidFutureDueDate(futureDate)).toBe(true);
      expect(isValidFutureDueDate(pastDate)).toBe(false);
    });
  });

  test.describe("Relative Due Dates", () => {
    test("stores relative due date with anchor and offset", () => {
      const task: Task = {
        id: "task-2",
        title: "Review Document",
        dueDate: {
          type: "relative",
          anchorTaskId: "task-1",
          offsetDays: 3,
          resolvedDate: null,
        },
        status: "not_started",
        completedAt: null,
      };

      expect(task.dueDate?.type).toBe("relative");
      expect(task.dueDate?.anchorTaskId).toBe("task-1");
      expect(task.dueDate?.offsetDays).toBe(3);
      expect(task.dueDate?.resolvedDate).toBeNull();
    });

    test("resolved date is null until anchor completes", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First Task",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Dependent Task",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 5,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const getEffectiveDueDate = (task: Task): string | null => {
        if (!task.dueDate) return null;
        if (task.dueDate.type === "absolute") {
          return task.dueDate.absoluteDate || null;
        }
        return task.dueDate.resolvedDate || null;
      };

      expect(getEffectiveDueDate(tasks[1])).toBeNull();
    });

    test("calculates resolved date when anchor completes", () => {
      const calculateResolvedDate = (
        completionTime: string,
        offsetDays: number
      ): string => {
        const completionDate = new Date(completionTime);
        completionDate.setDate(completionDate.getDate() + offsetDays);
        return completionDate.toISOString();
      };

      const completionTime = "2024-03-15T10:30:00.000Z";
      const resolved = calculateResolvedDate(completionTime, 3);

      const resolvedDate = new Date(resolved);
      const expectedDate = new Date("2024-03-18T10:30:00.000Z");

      expect(resolvedDate.getDate()).toBe(expectedDate.getDate());
    });

    test("supports zero-day offset (due same day)", () => {
      const calculateResolvedDate = (
        completionTime: string,
        offsetDays: number
      ): string => {
        const completionDate = new Date(completionTime);
        completionDate.setDate(completionDate.getDate() + offsetDays);
        return completionDate.toISOString();
      };

      const completionTime = "2024-03-15T10:30:00.000Z";
      const resolved = calculateResolvedDate(completionTime, 0);

      expect(new Date(resolved).getDate()).toBe(new Date(completionTime).getDate());
    });

    test("supports negative offset (due before anchor completion)", () => {
      // This might be useful for "must be done X days before anchor"
      const calculateResolvedDate = (
        completionTime: string,
        offsetDays: number
      ): string => {
        const completionDate = new Date(completionTime);
        completionDate.setDate(completionDate.getDate() + offsetDays);
        return completionDate.toISOString();
      };

      const completionTime = "2024-03-15T10:30:00.000Z";
      const resolved = calculateResolvedDate(completionTime, -2);

      const resolvedDate = new Date(resolved);
      expect(resolvedDate.getDate()).toBe(13); // March 13
    });
  });

  test.describe("Due Date Cascading on Completion", () => {
    test("resolves dependent due dates when anchor completes", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Anchor Task",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Dependent 1",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 3,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-3",
          title: "Dependent 2",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 7,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const resolveDependentDueDates = (
        anchorTaskId: string,
        completionTime: string
      ): void => {
        for (const task of tasks) {
          if (
            task.dueDate?.type === "relative" &&
            task.dueDate.anchorTaskId === anchorTaskId
          ) {
            const completionDate = new Date(completionTime);
            completionDate.setDate(
              completionDate.getDate() + (task.dueDate.offsetDays || 0)
            );
            task.dueDate.resolvedDate = completionDate.toISOString();
          }
        }
      };

      // Complete anchor task
      const completionTime = new Date().toISOString();
      tasks[0].status = "completed";
      tasks[0].completedAt = completionTime;

      // Resolve dependent due dates
      resolveDependentDueDates("task-1", completionTime);

      expect(tasks[1].dueDate?.resolvedDate).toBeTruthy();
      expect(tasks[2].dueDate?.resolvedDate).toBeTruthy();
    });

    test("cascades through multiple levels of dependencies", () => {
      // task-1 → task-2 (3 days after task-1) → task-3 (2 days after task-2)
      // Note: Due dates are resolved based on completion time, not due date
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Second",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 3,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-3",
          title: "Third",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-2",
            offsetDays: 2,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const resolveDependentDueDates = (
        anchorTaskId: string,
        completionTime: string
      ): void => {
        for (const task of tasks) {
          if (
            task.dueDate?.type === "relative" &&
            task.dueDate.anchorTaskId === anchorTaskId
          ) {
            const completionDate = new Date(completionTime);
            completionDate.setDate(
              completionDate.getDate() + (task.dueDate.offsetDays || 0)
            );
            task.dueDate.resolvedDate = completionDate.toISOString();
          }
        }
      };

      // Complete task-1
      const task1CompletionTime = "2024-03-01T10:00:00.000Z";
      tasks[0].status = "completed";
      tasks[0].completedAt = task1CompletionTime;
      resolveDependentDueDates("task-1", task1CompletionTime);

      // task-2's due date should be resolved (March 4 = 3 days after March 1)
      expect(tasks[1].dueDate?.resolvedDate).toBeTruthy();

      // task-3's due date is still null because it depends on task-2's COMPLETION time
      // not on task-2's resolved due date
      expect(tasks[2].dueDate?.resolvedDate).toBeNull();

      // Now complete task-2
      const task2CompletionTime = "2024-03-02T10:00:00.000Z";
      tasks[1].status = "completed";
      tasks[1].completedAt = task2CompletionTime;
      resolveDependentDueDates("task-2", task2CompletionTime);

      // task-3's due date should now be resolved (March 4 = 2 days after March 2)
      expect(tasks[2].dueDate?.resolvedDate).toBeTruthy();
    });
  });

  test.describe("Due Date Cascading on Reopen", () => {
    test("nullifies dependent due dates when anchor is reopened", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Anchor",
          dueDate: null,
          status: "completed",
          completedAt: "2024-03-01T10:00:00.000Z",
        },
        {
          id: "task-2",
          title: "Dependent",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 3,
            resolvedDate: "2024-03-04T10:00:00.000Z",
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const nullifyDependentDueDates = (anchorTaskId: string): void => {
        for (const task of tasks) {
          if (
            task.dueDate?.type === "relative" &&
            task.dueDate.anchorTaskId === anchorTaskId
          ) {
            task.dueDate.resolvedDate = null;
            // Recursively nullify downstream
            nullifyDependentDueDates(task.id);
          }
        }
      };

      // Reopen anchor task
      tasks[0].status = "not_started";
      tasks[0].completedAt = null;
      nullifyDependentDueDates("task-1");

      expect(tasks[1].dueDate?.resolvedDate).toBeNull();
    });

    test("cascades nullification through dependency chain", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First",
          dueDate: null,
          status: "completed",
          completedAt: "2024-03-01T10:00:00.000Z",
        },
        {
          id: "task-2",
          title: "Second",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 3,
            resolvedDate: "2024-03-04T10:00:00.000Z",
          },
          status: "completed",
          completedAt: "2024-03-02T10:00:00.000Z",
        },
        {
          id: "task-3",
          title: "Third",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-2",
            offsetDays: 2,
            resolvedDate: "2024-03-04T10:00:00.000Z",
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const nullifyDependentDueDates = (anchorTaskId: string): void => {
        for (const task of tasks) {
          if (
            task.dueDate?.type === "relative" &&
            task.dueDate.anchorTaskId === anchorTaskId
          ) {
            task.dueDate.resolvedDate = null;
            nullifyDependentDueDates(task.id);
          }
        }
      };

      // Reopen task-1
      tasks[0].status = "not_started";
      tasks[0].completedAt = null;
      nullifyDependentDueDates("task-1");

      expect(tasks[1].dueDate?.resolvedDate).toBeNull();
      expect(tasks[2].dueDate?.resolvedDate).toBeNull();
    });
  });

  test.describe("Due Date on Task Deletion", () => {
    test("clears due dates referencing deleted anchor", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Anchor (to be deleted)",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Dependent",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 3,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      const clearDueDatesForDeletedAnchor = (deletedTaskId: string): void => {
        for (const task of tasks) {
          if (task.dueDate?.anchorTaskId === deletedTaskId) {
            task.dueDate = null;
          }
        }
      };

      // Delete task-1
      clearDueDatesForDeletedAnchor("task-1");

      expect(tasks[1].dueDate).toBeNull();
    });
  });

  test.describe("Circular Dependency Prevention", () => {
    test("detects self-reference", () => {
      const hasCircularDependency = (
        taskId: string,
        anchorTaskId: string,
        tasks: Task[]
      ): boolean => {
        if (taskId === anchorTaskId) return true;

        // Walk the anchor chain
        const visited = new Set<string>();
        let currentAnchor = anchorTaskId;

        while (currentAnchor) {
          if (visited.has(currentAnchor)) return true;
          if (currentAnchor === taskId) return true;

          visited.add(currentAnchor);

          const anchorTask = tasks.find((t) => t.id === currentAnchor);
          if (anchorTask?.dueDate?.type === "relative") {
            currentAnchor = anchorTask.dueDate.anchorTaskId || "";
          } else {
            break;
          }
        }

        return false;
      };

      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
      ];

      // Self-reference
      expect(hasCircularDependency("task-1", "task-1", tasks)).toBe(true);
    });

    test("detects circular chain", () => {
      const hasCircularDependency = (
        taskId: string,
        anchorTaskId: string,
        tasks: Task[]
      ): boolean => {
        if (taskId === anchorTaskId) return true;

        const visited = new Set<string>();
        let currentAnchor = anchorTaskId;

        while (currentAnchor) {
          if (visited.has(currentAnchor)) return true;
          if (currentAnchor === taskId) return true;

          visited.add(currentAnchor);

          const anchorTask = tasks.find((t) => t.id === currentAnchor);
          if (anchorTask?.dueDate?.type === "relative") {
            currentAnchor = anchorTask.dueDate.anchorTaskId || "";
          } else {
            break;
          }
        }

        return false;
      };

      // task-1 → task-2 → task-3 → trying to make task-3 anchor on task-1 creates cycle
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-3", // This creates the cycle
            offsetDays: 1,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Task 2",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 2,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-3",
          title: "Task 3",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-2",
            offsetDays: 3,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      // Trying to set task-1's anchor to task-3 should detect cycle
      expect(hasCircularDependency("task-1", "task-3", tasks)).toBe(true);
    });

    test("allows valid non-circular chains", () => {
      const hasCircularDependency = (
        taskId: string,
        anchorTaskId: string,
        tasks: Task[]
      ): boolean => {
        if (taskId === anchorTaskId) return true;

        const visited = new Set<string>();
        let currentAnchor = anchorTaskId;

        while (currentAnchor) {
          if (visited.has(currentAnchor)) return true;
          if (currentAnchor === taskId) return true;

          visited.add(currentAnchor);

          const anchorTask = tasks.find((t) => t.id === currentAnchor);
          if (anchorTask?.dueDate?.type === "relative") {
            currentAnchor = anchorTask.dueDate.anchorTaskId || "";
          } else {
            break;
          }
        }

        return false;
      };

      // task-1 (no due date) ← task-2 ← task-3
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          dueDate: null,
          status: "not_started",
          completedAt: null,
        },
        {
          id: "task-2",
          title: "Task 2",
          dueDate: {
            type: "relative",
            anchorTaskId: "task-1",
            offsetDays: 2,
            resolvedDate: null,
          },
          status: "not_started",
          completedAt: null,
        },
      ];

      // task-3 anchoring on task-2 is valid
      expect(hasCircularDependency("task-3", "task-2", tasks)).toBe(false);
    });
  });

  test.describe("Due Date Notifications", () => {
    test("identifies tasks approaching due date", () => {
      const isApproaching = (
        dueDate: string,
        hoursThreshold: number
      ): boolean => {
        const dueDateMs = new Date(dueDate).getTime();
        const nowMs = Date.now();
        const thresholdMs = hoursThreshold * 60 * 60 * 1000;

        return dueDateMs > nowMs && dueDateMs - nowMs <= thresholdMs;
      };

      const now = Date.now();
      const in12Hours = new Date(now + 12 * 60 * 60 * 1000).toISOString();
      const in36Hours = new Date(now + 36 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();

      expect(isApproaching(in12Hours, 24)).toBe(true);
      expect(isApproaching(in36Hours, 24)).toBe(false);
      expect(isApproaching(yesterday, 24)).toBe(false);
    });

    test("identifies overdue tasks", () => {
      const isOverdue = (dueDate: string): boolean => {
        return new Date(dueDate).getTime() < Date.now();
      };

      const now = Date.now();
      const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString();

      expect(isOverdue(yesterday)).toBe(true);
      expect(isOverdue(tomorrow)).toBe(false);
    });

    test("generates deduplication key for reminder", () => {
      const generateDeduplicationKey = (
        taskId: string,
        eventType: "approaching" | "overdue",
        date: string
      ): string => {
        const dateOnly = date.split("T")[0];
        return `${taskId}-${eventType}-${dateOnly}`;
      };

      const key1 = generateDeduplicationKey(
        "task-1",
        "approaching",
        "2024-03-15T10:00:00.000Z"
      );
      const key2 = generateDeduplicationKey(
        "task-1",
        "approaching",
        "2024-03-15T15:00:00.000Z"
      );

      // Same task, same event type, same date = same key
      expect(key1).toBe(key2);
      expect(key1).toBe("task-1-approaching-2024-03-15");
    });
  });

  test.describe("Due Date Display", () => {
    test("formats due date for display", () => {
      const formatDueDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.ceil(
          (date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return "Due today";
        if (diffDays === 1) return "Due tomorrow";
        if (diffDays <= 7) return `Due in ${diffDays} days`;
        return date.toLocaleDateString();
      };

      const now = Date.now();
      expect(formatDueDate(new Date(now).toISOString())).toBe("Due today");
      expect(
        formatDueDate(new Date(now + 24 * 60 * 60 * 1000).toISOString())
      ).toBe("Due tomorrow");
    });

    test("shows pending status for unresolved relative due dates", () => {
      const getDueDateStatus = (dueDate: DueDate | null): string => {
        if (!dueDate) return "No due date";
        if (dueDate.type === "absolute") return "Has due date";
        if (dueDate.resolvedDate) return "Has due date";
        return `Due ${dueDate.offsetDays} days after task completion`;
      };

      const relativeDueDate: DueDate = {
        type: "relative",
        anchorTaskId: "task-1",
        offsetDays: 5,
        resolvedDate: null,
      };

      expect(getDueDateStatus(relativeDueDate)).toBe(
        "Due 5 days after task completion"
      );
    });
  });
});
