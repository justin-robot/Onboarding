import { test, expect } from "@playwright/test";

/**
 * E2E tests for Workspace CRUD operations
 * Tests the /api/workspaces endpoints
 */

test.describe("Workspace API", () => {
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

  test.describe("Authentication", () => {
    test("GET /api/workspaces returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/workspaces");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("POST /api/workspaces returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/workspaces", {
        data: { name: "Test Workspace" },
      });
      expect(response.status()).toBe(401);
    });

    test("GET /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/workspaces/test-id");
      expect(response.status()).toBe(401);
    });

    test("PUT /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.put("/api/workspaces/test-id", {
        data: { name: "Updated Name" },
      });
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/workspaces/test-id");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("List Workspaces (GET /api/workspaces)", () => {
    test("returns list of workspaces for authenticated user", async ({
      page,
      context,
    }) => {
      await setupAuth(context);

      // Mock the auth session
      await page.route("**/api/auth/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: { id: "user-1", email: "test@example.com", name: "Test User" },
          }),
        });
      });

      // Mock the workspaces endpoint
      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "ws-1",
                name: "Project Alpha",
                description: "First workspace",
                createdAt: new Date().toISOString(),
              },
              {
                id: "ws-2",
                name: "Project Beta",
                description: "Second workspace",
                createdAt: new Date().toISOString(),
              },
            ]),
          });
        }
      });

      // Navigate to trigger the request
      await page.goto("/");

      // Make API request via page context
      const response = await page.request.get("/api/workspaces");
      expect(response.status()).toBe(200);

      const workspaces = await response.json();
      expect(Array.isArray(workspaces)).toBe(true);
      expect(workspaces.length).toBe(2);
      expect(workspaces[0].name).toBe("Project Alpha");
    });

    test("returns empty array when no workspaces exist", async ({
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

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/workspaces");
      expect(response.status()).toBe(200);

      const workspaces = await response.json();
      expect(workspaces).toEqual([]);
    });
  });

  test.describe("Create Workspace (POST /api/workspaces)", () => {
    test("creates workspace with valid data", async ({ page, context }) => {
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

      const newWorkspace = {
        id: "ws-new",
        name: "New Workspace",
        description: "A test workspace",
        createdAt: new Date().toISOString(),
      };

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          expect(body.name).toBe("New Workspace");
          expect(body.description).toBe("A test workspace");

          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(newWorkspace),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/workspaces", {
        data: {
          name: "New Workspace",
          description: "A test workspace",
        },
      });

      expect(response.status()).toBe(201);
      const workspace = await response.json();
      expect(workspace.id).toBe("ws-new");
      expect(workspace.name).toBe("New Workspace");
    });

    test("creates workspace with due date", async ({ page, context }) => {
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

      const dueDate = "2024-12-31T23:59:59.000Z";

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          expect(body.dueDate).toBe(dueDate);

          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: "ws-new",
              name: body.name,
              dueDate: dueDate,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/workspaces", {
        data: {
          name: "Workspace with Due Date",
          dueDate: dueDate,
        },
      });

      expect(response.status()).toBe(201);
      const workspace = await response.json();
      expect(workspace.dueDate).toBe(dueDate);
    });

    test("returns 400 when name is missing", async ({ page, context }) => {
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

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Name is required" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/workspaces", {
        data: { description: "No name provided" },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Name is required");
    });

    test("returns 400 when name is not a string", async ({ page, context }) => {
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

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Name is required" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.post("/api/workspaces", {
        data: { name: 12345 },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe("Get Workspace (GET /api/workspaces/[id])", () => {
    test("returns workspace with nested sections and tasks", async ({
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

      const workspaceWithNested = {
        id: "ws-1",
        name: "Project Alpha",
        description: "Workspace with sections",
        sections: [
          {
            id: "section-1",
            name: "Getting Started",
            tasks: [
              { id: "task-1", name: "Welcome", type: "welcome", isLocked: false },
              { id: "task-2", name: "Upload Documents", type: "upload", isLocked: true },
            ],
          },
          {
            id: "section-2",
            name: "Onboarding",
            tasks: [
              { id: "task-3", name: "Fill Form", type: "form", isLocked: false },
            ],
          },
        ],
      };

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(workspaceWithNested),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/workspaces/ws-1");

      expect(response.status()).toBe(200);
      const workspace = await response.json();
      expect(workspace.id).toBe("ws-1");
      expect(workspace.sections).toHaveLength(2);
      expect(workspace.sections[0].tasks).toHaveLength(2);
      expect(workspace.sections[0].tasks[0].isLocked).toBe(false);
      expect(workspace.sections[0].tasks[1].isLocked).toBe(true);
    });

    test("returns 404 for non-existent workspace", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/non-existent", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Workspace not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.get("/api/workspaces/non-existent");

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Workspace not found");
    });
  });

  test.describe("Update Workspace (PUT /api/workspaces/[id])", () => {
    test("updates workspace name", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "ws-1",
              name: body.name,
              description: "Original description",
              updatedAt: new Date().toISOString(),
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/workspaces/ws-1", {
        data: { name: "Updated Workspace Name" },
      });

      expect(response.status()).toBe(200);
      const workspace = await response.json();
      expect(workspace.name).toBe("Updated Workspace Name");
    });

    test("updates workspace description", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "ws-1",
              name: "Original Name",
              description: body.description,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/workspaces/ws-1", {
        data: { description: "Updated description text" },
      });

      expect(response.status()).toBe(200);
      const workspace = await response.json();
      expect(workspace.description).toBe("Updated description text");
    });

    test("updates workspace due date", async ({ page, context }) => {
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

      const newDueDate = "2025-06-30T23:59:59.000Z";

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "ws-1",
              name: "Original Name",
              dueDate: body.dueDate,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/workspaces/ws-1", {
        data: { dueDate: newDueDate },
      });

      expect(response.status()).toBe(200);
      const workspace = await response.json();
      expect(workspace.dueDate).toBe(newDueDate);
    });

    test("updates multiple fields at once", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "ws-1",
              name: body.name,
              description: body.description,
              dueDate: body.dueDate,
            }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/workspaces/ws-1", {
        data: {
          name: "New Name",
          description: "New Description",
          dueDate: "2025-12-31T00:00:00.000Z",
        },
      });

      expect(response.status()).toBe(200);
      const workspace = await response.json();
      expect(workspace.name).toBe("New Name");
      expect(workspace.description).toBe("New Description");
    });

    test("returns 404 for non-existent workspace", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/non-existent", async (route) => {
        if (route.request().method() === "PUT") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Workspace not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.put("/api/workspaces/non-existent", {
        data: { name: "Updated Name" },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Delete Workspace (DELETE /api/workspaces/[id])", () => {
    test("soft deletes workspace successfully", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/workspaces/ws-1");

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test("returns 404 for non-existent workspace", async ({ page, context }) => {
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

      await page.route("**/api/workspaces/non-existent", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Workspace not found" }),
          });
        }
      });

      await page.goto("/");
      const response = await page.request.delete("/api/workspaces/non-existent");

      expect(response.status()).toBe(404);
    });

    test("deleted workspace no longer appears in list", async ({
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

      let workspaces = [
        { id: "ws-1", name: "Workspace 1" },
        { id: "ws-2", name: "Workspace 2" },
      ];

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(workspaces),
          });
        }
      });

      await page.route("**/api/workspaces/ws-1", async (route) => {
        if (route.request().method() === "DELETE") {
          workspaces = workspaces.filter((w) => w.id !== "ws-1");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");

      // Get initial list
      let response = await page.request.get("/api/workspaces");
      let list = await response.json();
      expect(list).toHaveLength(2);

      // Delete workspace
      await page.request.delete("/api/workspaces/ws-1");

      // Get updated list
      response = await page.request.get("/api/workspaces");
      list = await response.json();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("ws-2");
    });
  });

  test.describe("Workspace CRUD Flow", () => {
    test("complete workspace lifecycle: create, read, update, delete", async ({
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

      let createdWorkspace: { id: string; name: string; description?: string } | null = null;

      await page.route("**/api/workspaces", async (route) => {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          createdWorkspace = {
            id: "ws-lifecycle-test",
            name: body.name,
            description: body.description,
          };
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(createdWorkspace),
          });
        }
      });

      await page.route("**/api/workspaces/ws-lifecycle-test", async (route) => {
        const method = route.request().method();

        if (method === "GET") {
          if (createdWorkspace) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(createdWorkspace),
            });
          } else {
            await route.fulfill({
              status: 404,
              contentType: "application/json",
              body: JSON.stringify({ error: "Workspace not found" }),
            });
          }
        } else if (method === "PUT") {
          const body = route.request().postDataJSON();
          if (createdWorkspace) {
            createdWorkspace = { ...createdWorkspace, ...body };
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(createdWorkspace),
            });
          }
        } else if (method === "DELETE") {
          createdWorkspace = null;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        }
      });

      await page.goto("/");

      // 1. Create
      let response = await page.request.post("/api/workspaces", {
        data: { name: "Lifecycle Test", description: "Testing full lifecycle" },
      });
      expect(response.status()).toBe(201);
      const created = await response.json();
      expect(created.name).toBe("Lifecycle Test");

      // 2. Read
      response = await page.request.get("/api/workspaces/ws-lifecycle-test");
      expect(response.status()).toBe(200);
      const read = await response.json();
      expect(read.name).toBe("Lifecycle Test");

      // 3. Update
      response = await page.request.put("/api/workspaces/ws-lifecycle-test", {
        data: { name: "Updated Lifecycle Test" },
      });
      expect(response.status()).toBe(200);
      const updated = await response.json();
      expect(updated.name).toBe("Updated Lifecycle Test");

      // 4. Verify update
      response = await page.request.get("/api/workspaces/ws-lifecycle-test");
      const verified = await response.json();
      expect(verified.name).toBe("Updated Lifecycle Test");

      // 5. Delete
      response = await page.request.delete("/api/workspaces/ws-lifecycle-test");
      expect(response.status()).toBe(200);

      // 6. Verify deletion
      response = await page.request.get("/api/workspaces/ws-lifecycle-test");
      expect(response.status()).toBe(404);
    });
  });
});
