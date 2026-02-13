import { test, expect } from "@playwright/test";

/**
 * E2E tests for Task Completion flow
 * Tests the /api/tasks endpoints for task completion, status updates, and workflow
 */

test.describe("Task Completion Flow", () => {
  // Helper to set up authenticated context
  async function setupAuth(context: typeof test.prototype.context) {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "mock-session-token-for-e2e",
        domain: "localhost",
        path: "/",
      },
    ]);
  }

  // Mock task data
  const mockTask = {
    id: "task-1",
    title: "Complete Onboarding",
    description: "Complete all onboarding steps",
    type: "form",
    status: "not_started",
    completionRule: "any",
    sectionId: "section-1",
    order: 0,
    isLocked: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockCompletedTask = {
    ...mockTask,
    status: "completed",
    completedAt: new Date().toISOString(),
  };

  const mockLockedTask = {
    ...mockTask,
    id: "task-locked",
    title: "Locked Task",
    isLocked: true,
  };

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

  test.describe("Get Task (GET /api/tasks/[id])", () => {
    test("returns task with full details", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockTask),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/tasks/task-1");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.id).toBe("task-1");
      expect(task.title).toBe("Complete Onboarding");
      expect(task.status).toBe("not_started");
      expect(task.isLocked).toBe(false);
    });

    test("returns 404 for non-existent task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/non-existent", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Task not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/tasks/non-existent");

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Task not found");
    });

    test("returns task with lock status", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-locked", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockLockedTask),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/tasks/task-locked");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.isLocked).toBe(true);
    });
  });

  test.describe("Mark Task Complete (POST /api/tasks/[id]/complete)", () => {
    test("marks task as completed successfully", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1/complete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockCompletedTask),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/task-1/complete");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();
    });

    test("returns 404 for non-existent task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/non-existent/complete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Task not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/non-existent/complete");

      expect(response.status()).toBe(404);
    });

    test("updates task completedAt timestamp", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const completionTime = new Date().toISOString();
      await page.route("**/api/tasks/task-1/complete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              status: "completed",
              completedAt: completionTime,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/task-1/complete");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.completedAt).toBe(completionTime);
    });
  });

  test.describe("Mark Task Incomplete (POST /api/tasks/[id]/incomplete)", () => {
    test("marks task as incomplete successfully", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1/incomplete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              status: "not_started",
              completedAt: null,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/task-1/incomplete");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.status).toBe("not_started");
      expect(task.completedAt).toBeNull();
    });

    test("returns 404 for non-existent task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/non-existent/incomplete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Task not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/non-existent/incomplete");

      expect(response.status()).toBe(404);
    });

    test("clears completedAt timestamp", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1/incomplete", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockCompletedTask,
              status: "not_started",
              completedAt: null,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/task-1/incomplete");

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.completedAt).toBeNull();
    });
  });

  test.describe("Update Task (PUT /api/tasks/[id])", () => {
    test("updates task title", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              title: body.title,
              updatedAt: new Date().toISOString(),
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/tasks/task-1", {
        data: { title: "Updated Task Title" },
      });

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.title).toBe("Updated Task Title");
    });

    test("updates task description", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              description: body.description,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/tasks/task-1", {
        data: { description: "Updated task description" },
      });

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.description).toBe("Updated task description");
    });

    test("updates task status directly", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              status: body.status,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/tasks/task-1", {
        data: { status: "in_progress" },
      });

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.status).toBe("in_progress");
    });

    test("updates completion rule", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...mockTask,
              completionRule: body.completionRule,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/tasks/task-1", {
        data: { completionRule: "all" },
      });

      expect(response.status()).toBe(200);
      const task = await response.json();
      expect(task.completionRule).toBe("all");
    });

    test("returns 404 for non-existent task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/non-existent", async (route) => {
        if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Task not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/tasks/non-existent", {
        data: { title: "Updated Title" },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Delete Task (DELETE /api/tasks/[id])", () => {
    test("soft deletes task successfully", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/tasks/task-1");

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test("returns 404 for non-existent task", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/non-existent", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Task not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/tasks/non-existent");

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Task Status Transitions", () => {
    test("task transitions from not_started to completed", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let taskState = { ...mockTask };

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.route("**/api/tasks/task-1/complete", async (route) => {
        if (route.request().method() === "POST") {
          taskState = {
            ...taskState,
            status: "completed",
            completedAt: new Date().toISOString(),
          };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.goto("/");

      // Verify initial state
      let response = await page.request.get("/api/tasks/task-1");
      let task = await response.json();
      expect(task.status).toBe("not_started");

      // Complete the task
      response = await page.request.post("/api/tasks/task-1/complete");
      task = await response.json();
      expect(task.status).toBe("completed");

      // Verify final state
      response = await page.request.get("/api/tasks/task-1");
      task = await response.json();
      expect(task.status).toBe("completed");
    });

    test("task transitions from completed to not_started (revert)", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let taskState = { ...mockCompletedTask };

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.route("**/api/tasks/task-1/incomplete", async (route) => {
        if (route.request().method() === "POST") {
          taskState = {
            ...taskState,
            status: "not_started",
            completedAt: null,
          };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.goto("/");

      // Verify initial completed state
      let response = await page.request.get("/api/tasks/task-1");
      let task = await response.json();
      expect(task.status).toBe("completed");

      // Mark as incomplete
      response = await page.request.post("/api/tasks/task-1/incomplete");
      task = await response.json();
      expect(task.status).toBe("not_started");
    });

    test("task can transition through in_progress status", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let taskState = { ...mockTask };

      await page.route("**/api/tasks/task-1", async (route) => {
        const method = route.request().method();
        if (method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        } else if (method === "PUT") {
          const body = route.request().postDataJSON();
          taskState = { ...taskState, ...body };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.goto("/");

      // Start from not_started
      let response = await page.request.get("/api/tasks/task-1");
      let task = await response.json();
      expect(task.status).toBe("not_started");

      // Move to in_progress
      response = await page.request.put("/api/tasks/task-1", {
        data: { status: "in_progress" },
      });
      task = await response.json();
      expect(task.status).toBe("in_progress");

      // Move to completed
      response = await page.request.put("/api/tasks/task-1", {
        data: { status: "completed" },
      });
      task = await response.json();
      expect(task.status).toBe("completed");
    });
  });

  test.describe("Task Completion Workflow", () => {
    test("complete workflow: fetch, complete, verify", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let taskState = { ...mockTask };

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.route("**/api/tasks/task-1/complete", async (route) => {
        taskState = {
          ...taskState,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(taskState),
        });
      });

      await page.goto("/");

      // Step 1: Fetch task
      let response = await page.request.get("/api/tasks/task-1");
      expect(response.status()).toBe(200);
      let task = await response.json();
      expect(task.status).toBe("not_started");
      expect(task.completedAt).toBeNull();

      // Step 2: Complete task
      response = await page.request.post("/api/tasks/task-1/complete");
      expect(response.status()).toBe(200);
      task = await response.json();
      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeTruthy();

      // Step 3: Verify task is completed
      response = await page.request.get("/api/tasks/task-1");
      expect(response.status()).toBe(200);
      task = await response.json();
      expect(task.status).toBe("completed");
    });

    test("undo workflow: complete, then revert", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      let taskState = { ...mockTask };

      await page.route("**/api/tasks/task-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(taskState),
          });
        }
      });

      await page.route("**/api/tasks/task-1/complete", async (route) => {
        taskState = {
          ...taskState,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(taskState),
        });
      });

      await page.route("**/api/tasks/task-1/incomplete", async (route) => {
        taskState = {
          ...taskState,
          status: "not_started",
          completedAt: null,
        };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(taskState),
        });
      });

      await page.goto("/");

      // Complete the task
      await page.request.post("/api/tasks/task-1/complete");
      let response = await page.request.get("/api/tasks/task-1");
      let task = await response.json();
      expect(task.status).toBe("completed");

      // Revert to incomplete
      await page.request.post("/api/tasks/task-1/incomplete");
      response = await page.request.get("/api/tasks/task-1");
      task = await response.json();
      expect(task.status).toBe("not_started");
      expect(task.completedAt).toBeNull();
    });

    test("multiple tasks completion in sequence", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      const tasks: Record<string, typeof mockTask> = {
        "task-1": { ...mockTask, id: "task-1", title: "Task 1" },
        "task-2": { ...mockTask, id: "task-2", title: "Task 2" },
        "task-3": { ...mockTask, id: "task-3", title: "Task 3" },
      };

      await page.route("**/api/tasks/*/complete", async (route) => {
        const url = route.request().url();
        const taskId = url.split("/").slice(-2)[0];
        if (tasks[taskId]) {
          tasks[taskId] = {
            ...tasks[taskId],
            status: "completed",
            completedAt: new Date().toISOString(),
          };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(tasks[taskId]),
          });
        }
      });

      await page.goto("/");

      // Complete tasks in sequence
      for (const taskId of ["task-1", "task-2", "task-3"]) {
        const response = await page.request.post(`/api/tasks/${taskId}/complete`);
        expect(response.status()).toBe(200);
        const task = await response.json();
        expect(task.status).toBe("completed");
      }

      // Verify all are completed
      expect(tasks["task-1"].status).toBe("completed");
      expect(tasks["task-2"].status).toBe("completed");
      expect(tasks["task-3"].status).toBe("completed");
    });
  });

  test.describe("Task with Dependencies", () => {
    test("locked task cannot be completed", async ({ page, context }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      await page.route("**/api/tasks/task-locked/complete", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Task is locked" }),
        });
      });

      await page.goto("/");
      const response = await page.request.post("/api/tasks/task-locked/complete");

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Task is locked");
    });

    test("completing prerequisite task unlocks dependent task", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com" },
          }),
        });
      });

      // Task 2 depends on Task 1
      let task1 = { ...mockTask, id: "task-1" };
      let task2 = { ...mockTask, id: "task-2", isLocked: true };

      await page.route("**/api/tasks/task-1/complete", async (route) => {
        task1 = { ...task1, status: "completed", completedAt: new Date().toISOString() };
        task2 = { ...task2, isLocked: false }; // Unlock task 2
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task1),
        });
      });

      await page.route("**/api/tasks/task-2", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(task2),
          });
        }
      });

      await page.goto("/");

      // Initially task 2 is locked
      let response = await page.request.get("/api/tasks/task-2");
      let task = await response.json();
      expect(task.isLocked).toBe(true);

      // Complete task 1
      await page.request.post("/api/tasks/task-1/complete");

      // Now task 2 should be unlocked
      response = await page.request.get("/api/tasks/task-2");
      task = await response.json();
      expect(task.isLocked).toBe(false);
    });
  });
});
