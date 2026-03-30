import { test as baseTest, expect } from "@playwright/test";
import { test } from "./fixtures/auth";

/**
 * E2E tests for Workspace API
 *
 * These tests verify the API endpoints work correctly.
 * - Unauthenticated tests verify 401 responses (run against real API)
 * - Authenticated tests use adminPage fixture for real authentication
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

  // Authenticated operations using adminPage fixture
  test.describe("Authenticated Operations", () => {
    test("can list workspaces when authenticated", async ({ adminPage }) => {
      // Navigate to a page first so fetch has a base URL
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      const response = await adminPage.evaluate(async () => {
        const res = await fetch("/api/workspaces");
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test("can create a workspace", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      const workspaceName = `Test Workspace ${Date.now()}`;

      const response = await adminPage.evaluate(async (name) => {
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
    });

    test("returns 400 when creating workspace without name", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      const response = await adminPage.evaluate(async () => {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "No name" }),
        });
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test("can get a workspace by ID", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      // Create a workspace first
      const createResponse = await adminPage.evaluate(async () => {
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
      const getResponse = await adminPage.evaluate(async (id) => {
        const res = await fetch(`/api/workspaces/${id}`);
        return { status: res.status, body: await res.json() };
      }, workspaceId);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(workspaceId);
    });

    test("returns 404 for non-existent workspace", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      const response = await adminPage.evaluate(async () => {
        const res = await fetch("/api/workspaces/non-existent-id-12345");
        return { status: res.status, body: await res.json() };
      });

      expect(response.status).toBe(404);
    });

    test("can update a workspace", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      // Create a workspace first
      const createResponse = await adminPage.evaluate(async () => {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Original Name" }),
        });
        return { status: res.status, body: await res.json() };
      });

      const workspaceId = createResponse.body.id;

      // Update it
      const updateResponse = await adminPage.evaluate(
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
    });

    test("can delete a workspace", async ({ adminPage }) => {
      await adminPage.goto("/workspaces");
      await adminPage.waitForLoadState("networkidle");

      // Create a workspace first
      const createResponse = await adminPage.evaluate(async () => {
        const res = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Workspace to Delete" }),
        });
        return { status: res.status, body: await res.json() };
      });

      const workspaceId = createResponse.body.id;

      // Delete it
      const deleteResponse = await adminPage.evaluate(async (id) => {
        const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
        return { status: res.status, body: await res.json() };
      }, workspaceId);

      expect(deleteResponse.status).toBe(200);
    });
  });
});
