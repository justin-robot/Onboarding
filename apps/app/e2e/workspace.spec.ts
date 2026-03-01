import { test, expect } from "@playwright/test";

/**
 * E2E tests for Workspace API
 *
 * These tests verify the API endpoints work correctly.
 * - Unauthenticated tests verify 401 responses (run against real API)
 * - Authenticated tests are skipped - they require test infrastructure:
 *   1. A seeded test user in the database
 *   2. Email verification disabled or pre-verified user
 *   3. Known test credentials
 *
 * To enable authenticated tests:
 * 1. Create a test user in your database with known credentials
 * 2. Set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
 * 3. Remove the .skip from the "Authenticated Operations" describe block
 */

test.describe("Workspace API", () => {
  test.describe("Authentication - Unauthenticated Requests", () => {
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

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("GET /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/workspaces/test-id");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("PUT /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.put("/api/workspaces/test-id", {
        data: { name: "Updated Name" },
      });
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    test("DELETE /api/workspaces/[id] returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/workspaces/test-id");
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // These tests require a seeded test user - skip until test infrastructure is set up
  test.describe.skip("Authenticated Operations", () => {
    // To enable these tests:
    // 1. Seed a test user in your database
    // 2. Update these credentials
    const TEST_USER = {
      email: process.env.TEST_USER_EMAIL || "test@example.com",
      password: process.env.TEST_USER_PASSWORD || "testpassword123",
    };

    // Helper to sign in and get authenticated page
    async function getAuthenticatedPage(browser: typeof test.prototype.browser) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("/sign-in");
      await page.waitForLoadState("domcontentloaded");

      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill(TEST_USER.password);
      await page.getByRole("button", { name: "Sign in" }).click();

      // Wait for sign-in to complete
      await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
        timeout: 10000,
      });

      return { page, context };
    }

    test("can list workspaces when authenticated", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        const response = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces");
          return { status: res.status, body: await res.json() };
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      } finally {
        await context.close();
      }
    });

    test("can create a workspace", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        const workspaceName = `Test Workspace ${Date.now()}`;

        const response = await page.evaluate(async (name) => {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description: "Test description" }),
          });
          return { status: res.status, body: await res.json() };
        }, workspaceName);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(workspaceName);
        expect(response.body.id).toBeDefined();
      } finally {
        await context.close();
      }
    });

    test("returns 400 when creating workspace without name", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        const response = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: "No name" }),
          });
          return { status: res.status, body: await res.json() };
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      } finally {
        await context.close();
      }
    });

    test("can get a workspace by ID", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        // Create a workspace first
        const createResponse = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Workspace to Get" }),
          });
          return { status: res.status, body: await res.json() };
        });

        expect(createResponse.status).toBe(201);
        const workspaceId = createResponse.body.id;

        // Get it by ID
        const getResponse = await page.evaluate(async (id) => {
          const res = await fetch(`/api/workspaces/${id}`);
          return { status: res.status, body: await res.json() };
        }, workspaceId);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.id).toBe(workspaceId);
      } finally {
        await context.close();
      }
    });

    test("returns 404 for non-existent workspace", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        const response = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces/non-existent-id");
          return { status: res.status, body: await res.json() };
        });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Workspace not found");
      } finally {
        await context.close();
      }
    });

    test("can update a workspace", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        // Create a workspace first
        const createResponse = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Original Name" }),
          });
          return { status: res.status, body: await res.json() };
        });

        const workspaceId = createResponse.body.id;

        // Update it
        const updateResponse = await page.evaluate(
          async ({ id, newName }) => {
            const res = await fetch(`/api/workspaces/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            });
            return { status: res.status, body: await res.json() };
          },
          { id: workspaceId, newName: "Updated Name" }
        );

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.name).toBe("Updated Name");
      } finally {
        await context.close();
      }
    });

    test("can delete a workspace", async ({ browser }) => {
      const { page, context } = await getAuthenticatedPage(browser);

      try {
        // Create a workspace first
        const createResponse = await page.evaluate(async () => {
          const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Workspace to Delete" }),
          });
          return { status: res.status, body: await res.json() };
        });

        const workspaceId = createResponse.body.id;

        // Delete it
        const deleteResponse = await page.evaluate(async (id) => {
          const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
          return { status: res.status, body: await res.json() };
        }, workspaceId);

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);

        // Verify it's gone
        const getResponse = await page.evaluate(async (id) => {
          const res = await fetch(`/api/workspaces/${id}`);
          return { status: res.status };
        }, workspaceId);

        expect(getResponse.status).toBe(404);
      } finally {
        await context.close();
      }
    });
  });
});
