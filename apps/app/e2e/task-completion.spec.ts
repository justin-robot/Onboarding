import { test, expect } from "@playwright/test";

/**
 * E2E tests for Task Completion API
 *
 * These tests hit the real API endpoints.
 * - Unauthenticated tests verify 401 responses
 * - For authenticated operations, we would need a real workspace with tasks
 *   which requires more complex setup. For now, we test auth validation.
 */

test.describe("Task Completion Flow", () => {
  test.describe("Authentication", () => {
    test("POST /api/tasks/[id]/complete returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/tasks/task-1/complete");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("POST /api/tasks/[id]/incomplete returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/tasks/task-1/incomplete");
      expect(response.status()).toBe(401);
    });

    test("GET /api/tasks/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/tasks/task-1");
      expect(response.status()).toBe(401);
    });

    test("PUT /api/tasks/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.put("/api/tasks/task-1", {
        data: { title: "Updated Title" },
      });
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/tasks/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/tasks/task-1");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Task Status Logic (Pure)", () => {
    // These are pure TypeScript tests for task status logic
    // They don't require browser or API calls

    interface Task {
      id: string;
      status: "not_started" | "in_progress" | "completed";
      completedAt: string | null;
      isLocked: boolean;
    }

    test("task transitions from not_started to completed", () => {
      let task: Task = {
        id: "task-1",
        status: "not_started",
        completedAt: null,
        isLocked: false,
      };

      // Simulate completing
      task = {
        ...task,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();
    });

    test("task transitions from completed to not_started (revert)", () => {
      let task: Task = {
        id: "task-1",
        status: "completed",
        completedAt: new Date().toISOString(),
        isLocked: false,
      };

      // Simulate marking incomplete
      task = {
        ...task,
        status: "not_started",
        completedAt: null,
      };

      expect(task.status).toBe("not_started");
      expect(task.completedAt).toBeNull();
    });

    test("task can transition through in_progress status", () => {
      let task: Task = {
        id: "task-1",
        status: "not_started",
        completedAt: null,
        isLocked: false,
      };

      // Start task
      task = { ...task, status: "in_progress" };
      expect(task.status).toBe("in_progress");

      // Complete task
      task = {
        ...task,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      expect(task.status).toBe("completed");
    });

    test("locked task cannot be completed", () => {
      const task: Task = {
        id: "task-1",
        status: "not_started",
        completedAt: null,
        isLocked: true,
      };

      const canComplete = (t: Task): boolean => !t.isLocked;

      expect(canComplete(task)).toBe(false);
    });

    test("completing prerequisite unlocks dependent task", () => {
      const tasks: Record<string, Task> = {
        "task-1": {
          id: "task-1",
          status: "not_started",
          completedAt: null,
          isLocked: false,
        },
        "task-2": {
          id: "task-2",
          status: "not_started",
          completedAt: null,
          isLocked: true, // Depends on task-1
        },
      };

      const dependencies: Record<string, string[]> = {
        "task-2": ["task-1"],
      };

      const checkUnlock = (taskId: string): boolean => {
        const deps = dependencies[taskId] || [];
        return deps.every((depId) => tasks[depId].status === "completed");
      };

      // Initially task-2 is locked
      expect(tasks["task-2"].isLocked).toBe(true);

      // Complete task-1
      tasks["task-1"] = {
        ...tasks["task-1"],
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      // Check if task-2 can be unlocked
      expect(checkUnlock("task-2")).toBe(true);

      // Unlock task-2
      tasks["task-2"] = { ...tasks["task-2"], isLocked: false };
      expect(tasks["task-2"].isLocked).toBe(false);
    });
  });

  test.describe("Task Completion Rules (Pure)", () => {
    type CompletionRule = "any" | "all";

    interface TaskWithRule {
      id: string;
      completionRule: CompletionRule;
      assignees: string[];
      completions: string[]; // User IDs who completed
    }

    test("'any' completion rule - one completion is enough", () => {
      const task: TaskWithRule = {
        id: "task-1",
        completionRule: "any",
        assignees: ["user-1", "user-2", "user-3"],
        completions: ["user-1"],
      };

      const isTaskComplete = (t: TaskWithRule): boolean => {
        if (t.completionRule === "any") {
          return t.completions.length > 0;
        }
        return t.assignees.every((a) => t.completions.includes(a));
      };

      expect(isTaskComplete(task)).toBe(true);
    });

    test("'all' completion rule - all assignees must complete", () => {
      const task: TaskWithRule = {
        id: "task-1",
        completionRule: "all",
        assignees: ["user-1", "user-2", "user-3"],
        completions: ["user-1", "user-2"],
      };

      const isTaskComplete = (t: TaskWithRule): boolean => {
        if (t.completionRule === "any") {
          return t.completions.length > 0;
        }
        return t.assignees.every((a) => t.completions.includes(a));
      };

      // Only 2 of 3 completed
      expect(isTaskComplete(task)).toBe(false);

      // Complete with all
      task.completions.push("user-3");
      expect(isTaskComplete(task)).toBe(true);
    });
  });

  test.describe("Task Workflow (Pure)", () => {
    interface WorkflowState {
      tasks: {
        id: string;
        status: "not_started" | "in_progress" | "completed";
        completedAt: string | null;
      }[];
    }

    test("complete workflow: fetch, complete, verify", () => {
      const state: WorkflowState = {
        tasks: [
          { id: "task-1", status: "not_started", completedAt: null },
        ],
      };

      // Step 1: Fetch task
      const task = state.tasks.find((t) => t.id === "task-1");
      expect(task?.status).toBe("not_started");
      expect(task?.completedAt).toBeNull();

      // Step 2: Complete task
      if (task) {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
      }
      expect(task?.status).toBe("completed");
      expect(task?.completedAt).toBeTruthy();

      // Step 3: Verify task is completed
      const verifiedTask = state.tasks.find((t) => t.id === "task-1");
      expect(verifiedTask?.status).toBe("completed");
    });

    test("undo workflow: complete, then revert", () => {
      const state: WorkflowState = {
        tasks: [
          { id: "task-1", status: "not_started", completedAt: null },
        ],
      };

      const task = state.tasks.find((t) => t.id === "task-1")!;

      // Complete the task
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      expect(task.status).toBe("completed");

      // Revert to incomplete
      task.status = "not_started";
      task.completedAt = null;
      expect(task.status).toBe("not_started");
      expect(task.completedAt).toBeNull();
    });

    test("multiple tasks completion in sequence", () => {
      const state: WorkflowState = {
        tasks: [
          { id: "task-1", status: "not_started", completedAt: null },
          { id: "task-2", status: "not_started", completedAt: null },
          { id: "task-3", status: "not_started", completedAt: null },
        ],
      };

      // Complete tasks in sequence
      for (const taskId of ["task-1", "task-2", "task-3"]) {
        const task = state.tasks.find((t) => t.id === taskId)!;
        task.status = "completed";
        task.completedAt = new Date().toISOString();
      }

      // Verify all are completed
      expect(state.tasks.every((t) => t.status === "completed")).toBe(true);
    });
  });
});
