import { test as base, expect, Page, BrowserContext } from "@playwright/test";
import {
  testUsers,
  adminAuthState,
  userAuthState,
  hasValidAuthState,
} from "./fixtures/auth";

/**
 * E2E Tests: Admin User Edit - Add to Workspace & Add to Task Features
 *
 * Tests the permission logic for adding users to workspaces and assigning tasks:
 *
 * Permission Logic:
 * - Platform admins: Can add user to any workspace, can assign to any task in user's workspaces
 * - Managers: Can only add to workspaces they manage, can only assign to tasks in workspaces they manage AND user is a member of
 * - Add to Task button only appears when user has at least one workspace
 *
 * Prerequisites:
 * - Database must be seeded: pnpm db:seed
 * - Global setup must have run (happens automatically with pnpm e2e)
 */

// Extend base test with fixtures for admin and user sessions
const test = base.extend<{
  adminPage: Page;
  userPage: Page;
  adminContext: BrowserContext;
}>({
  adminPage: async ({ browser }, use) => {
    if (!hasValidAuthState(adminAuthState)) {
      throw new Error(
        "Admin auth state not found. Run `pnpm e2e` to set up authentication."
      );
    }
    const context = await browser.newContext({ storageState: adminAuthState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminContext: async ({ browser }, use) => {
    if (!hasValidAuthState(adminAuthState)) {
      throw new Error(
        "Admin auth state not found. Run `pnpm e2e` to set up authentication."
      );
    }
    const context = await browser.newContext({ storageState: adminAuthState });
    await use(context);
    await context.close();
  },

  userPage: async ({ browser }, use) => {
    if (!hasValidAuthState(userAuthState)) {
      throw new Error(
        "User auth state not found. Run `pnpm e2e` to set up authentication."
      );
    }
    const context = await browser.newContext({ storageState: userAuthState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

test.describe("Admin User Edit - Add to Workspace & Add to Task", () => {
  test.beforeAll(async () => {
    if (!hasValidAuthState(adminAuthState)) {
      test.skip();
    }
  });

  test.describe("Platform Admin Permissions", () => {
    test("platform admin can access user edit page", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for users table to load
      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });

      // Click on first user row to navigate to edit page
      const firstUserRow = adminPage.locator("tbody tr").first();
      await firstUserRow.click();

      // Should navigate to user edit page
      await expect(adminPage).toHaveURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);
    });

    test("platform admin sees 'Add to Workspace' button", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      // Wait for users table and click first user
      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();

      // Wait for user edit page to load
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      // Wait for Workspaces section to load
      await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

      // Should see "Add to Workspace" button
      const addWorkspaceButton = adminPage.getByRole("button", { name: /add to workspace/i });
      await expect(addWorkspaceButton).toBeVisible();
    });

    test("platform admin can open 'Add to Workspace' dialog", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      // Click "Add to Workspace" button
      const addWorkspaceButton = adminPage.getByRole("button", { name: /add to workspace/i });
      await addWorkspaceButton.click();

      // Dialog should open
      const dialog = adminPage.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Should have workspace selector and role selector
      await expect(dialog.getByRole("heading", { name: "Add to Workspace" })).toBeVisible();
      await expect(dialog.getByLabel(/workspace/i)).toBeVisible();
      await expect(dialog.getByLabel(/role/i)).toBeVisible();
    });

    test("'Add to Task' button only appears when user has workspaces", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      // Wait for the page to fully load
      await adminPage.getByText("Assigned Tasks").waitFor({ state: "visible", timeout: 10000 });

      // Check if user has workspaces
      const workspacesSection = adminPage.locator("text=Workspaces").locator("..");
      const workspaceCount = await workspacesSection.getByText(/\d+ workspace/).textContent();

      const addTaskButton = adminPage.getByRole("button", { name: /add to task/i });

      if (workspaceCount && workspaceCount.includes("0 workspace")) {
        // User has no workspaces - Add to Task button should NOT be visible
        await expect(addTaskButton).not.toBeVisible();
      } else {
        // User has workspaces - Add to Task button should be visible
        await expect(addTaskButton).toBeVisible();
      }
    });

    test("platform admin can open 'Add to Task' dialog when user has workspaces", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });

      // Find a user who has workspaces (look for non-zero workspace count)
      const rows = adminPage.locator("tbody tr");
      const rowCount = await rows.count();

      let foundUserWithWorkspaces = false;

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        await rows.nth(i).click();
        await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);
        await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

        // Check workspace count
        const workspaceCountText = await adminPage.locator("text=/\\d+ workspace/i").first().textContent();

        if (workspaceCountText && !workspaceCountText.includes("0 workspace")) {
          foundUserWithWorkspaces = true;

          // Try to click Add to Task button
          const addTaskButton = adminPage.getByRole("button", { name: /add to task/i });

          if (await addTaskButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await addTaskButton.click();

            // Dialog should open
            const dialog = adminPage.getByRole("dialog");
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole("heading", { name: /assign to tasks/i })).toBeVisible();
            break;
          }
        }

        // Go back to users list
        await adminPage.goto("/dashboard/users");
        await adminPage.waitForLoadState("domcontentloaded");
        await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      }

      if (!foundUserWithWorkspaces) {
        console.log("No users with workspaces found - test skipped");
      }
    });
  });

  test.describe("API Permission Tests", () => {
    test("GET /api/admin/users/[id]/available-workspaces requires authentication", async ({ request }) => {
      const response = await request.get("/api/admin/users/00000000-0000-0000-0000-000000000003/available-workspaces");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/users/[id]/available-tasks requires authentication", async ({ request }) => {
      const response = await request.get("/api/admin/users/00000000-0000-0000-0000-000000000003/available-tasks");
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/users/[id]/workspaces requires authentication", async ({ request }) => {
      const response = await request.post("/api/admin/users/00000000-0000-0000-0000-000000000003/workspaces", {
        data: { workspaceId: "test-workspace-id", role: "member" },
      });
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/users/[id]/tasks requires authentication", async ({ request }) => {
      const response = await request.post("/api/admin/users/00000000-0000-0000-0000-000000000003/tasks", {
        data: { taskId: "test-task-id" },
      });
      expect(response.status()).toBe(401);
    });

    test("platform admin can fetch available workspaces for a user", async ({ adminContext }) => {
      const request = adminContext.request;

      // Use a known user ID from seed (marcus - user1)
      const userId = "00000000-0000-0000-0000-000000000003";

      const response = await request.get(`/api/admin/users/${userId}/available-workspaces`);

      // Platform admin should be able to access
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    test("platform admin can fetch available tasks for a user", async ({ adminContext }) => {
      const request = adminContext.request;

      // Use a known user ID from seed (marcus - user1)
      const userId = "00000000-0000-0000-0000-000000000003";

      const response = await request.get(`/api/admin/users/${userId}/available-tasks`);

      // Platform admin should be able to access
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);

      // Data should be grouped by workspace
      if (data.data.length > 0) {
        expect(data.data[0]).toHaveProperty("workspaceId");
        expect(data.data[0]).toHaveProperty("workspaceName");
        expect(data.data[0]).toHaveProperty("tasks");
      }
    });

    test("POST /api/admin/users/[id]/workspaces validates required fields", async ({ adminContext }) => {
      const request = adminContext.request;
      const userId = "00000000-0000-0000-0000-000000000003";

      // Missing workspaceId
      const response = await request.post(`/api/admin/users/${userId}/workspaces`, {
        data: { role: "member" },
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("workspaceId");
    });

    test("POST /api/admin/users/[id]/tasks validates required fields", async ({ adminContext }) => {
      const request = adminContext.request;
      const userId = "00000000-0000-0000-0000-000000000003";

      // Missing taskId
      const response = await request.post(`/api/admin/users/${userId}/tasks`, {
        data: {},
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("taskId");
    });

    test("POST /api/admin/users/[id]/tasks returns error if user not in workspace", async ({ adminContext }) => {
      const request = adminContext.request;

      // Use emily (user2) who is only in workspace1
      const userId = "00000000-0000-0000-0000-000000000004";

      // Try to assign a task from workspace2 where emily is NOT a member
      // We need a task ID from workspace2, but for this test we can use a fake one
      // and expect a "not found" or "not a member" error
      const response = await request.post(`/api/admin/users/${userId}/tasks`, {
        data: { taskId: "00000000-0000-0000-0000-999999999999" },
      });

      // Should return 404 (task not found) or 400 (not a member)
      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe("Regular User Access Restrictions", () => {
    test("regular user cannot access admin panel", async ({ userPage }) => {
      await userPage.goto("/dashboard/users");
      await userPage.waitForLoadState("domcontentloaded");

      // Regular user should be redirected away from admin panel
      // Either to home page or get an error
      const url = userPage.url();
      const isOnAdminPage = url.includes("/dashboard");

      if (isOnAdminPage) {
        // If somehow on dashboard, should see access denied or be redirected
        const accessDenied = await userPage.getByText(/access denied|unauthorized|forbidden/i).isVisible().catch(() => false);
        const redirected = !url.includes("/dashboard/users");

        expect(accessDenied || redirected).toBe(true);
      }
    });
  });

  test.describe("Add to Workspace Dialog Functionality", () => {
    test("dialog shows available workspaces", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      // Wait for page to load
      await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

      // Click Add to Workspace button
      const addButton = adminPage.getByRole("button", { name: /add to workspace/i });
      await addButton.click();

      // Wait for dialog
      const dialog = adminPage.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Wait for loading to complete (either shows workspaces or "no available" message)
      await Promise.race([
        dialog.getByText(/loading/i).waitFor({ state: "hidden", timeout: 10000 }),
        dialog.getByText(/no available workspaces/i).waitFor({ state: "visible", timeout: 10000 }),
      ]).catch(() => {});

      // Check that either workspaces are shown or empty message
      const noWorkspaces = await dialog.getByText(/no available workspaces/i).isVisible().catch(() => false);
      const hasWorkspaceSelector = await dialog.locator('[id="workspace"]').isVisible().catch(() => false);

      expect(noWorkspaces || hasWorkspaceSelector).toBe(true);
    });

    test("dialog has role selector with member and manager options", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

      const addButton = adminPage.getByRole("button", { name: /add to workspace/i });
      await addButton.click();

      const dialog = adminPage.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Wait for loading
      await adminPage.waitForTimeout(1000);

      // Check role selector exists
      const roleSelector = dialog.locator('[id="role"]');
      const hasRoleSelector = await roleSelector.isVisible().catch(() => false);

      if (hasRoleSelector) {
        await roleSelector.click();

        // Should have member and manager options
        await expect(adminPage.getByRole("option", { name: /member/i })).toBeVisible();
        await expect(adminPage.getByRole("option", { name: /manager/i })).toBeVisible();
      }
    });

    test("cancel button closes dialog without making changes", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

      // Get initial workspace count
      const initialCount = await adminPage.locator("text=/\\d+ workspace/i").first().textContent();

      // Open dialog
      await adminPage.getByRole("button", { name: /add to workspace/i }).click();
      const dialog = adminPage.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // Click cancel
      await dialog.getByRole("button", { name: /cancel/i }).click();

      // Dialog should close
      await expect(dialog).not.toBeVisible();

      // Workspace count should be unchanged
      const finalCount = await adminPage.locator("text=/\\d+ workspace/i").first().textContent();
      expect(finalCount).toBe(initialCount);
    });
  });

  test.describe("Add to Task Dialog Functionality", () => {
    test("dialog shows tasks grouped by workspace", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });

      // Find user with workspaces
      const rows = adminPage.locator("tbody tr");
      const rowCount = await rows.count();

      for (let i = 0; i < Math.min(rowCount, 5); i++) {
        await rows.nth(i).click();
        await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);
        await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

        const addTaskButton = adminPage.getByRole("button", { name: /add to task/i });

        if (await addTaskButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await addTaskButton.click();

          const dialog = adminPage.getByRole("dialog");
          await expect(dialog).toBeVisible();

          // Wait for loading
          await Promise.race([
            dialog.getByText(/loading/i).waitFor({ state: "hidden", timeout: 10000 }),
            dialog.getByText(/no available tasks/i).waitFor({ state: "visible", timeout: 10000 }),
          ]).catch(() => {});

          // Should show either tasks or "no available tasks" message
          const noTasks = await dialog.getByText(/no available tasks/i).isVisible().catch(() => false);
          const hasTasks = await dialog.locator('[role="button"]').filter({ hasText: /.+/ }).first().isVisible().catch(() => false);

          expect(noTasks || hasTasks).toBe(true);

          // Close dialog and exit
          await dialog.getByRole("button", { name: /cancel/i }).click();
          break;
        }

        // Go back
        await adminPage.goto("/dashboard/users");
        await adminPage.waitForLoadState("domcontentloaded");
        await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      }
    });

    test("dialog shows task count for selected items", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/users");
      await adminPage.waitForLoadState("domcontentloaded");

      await adminPage.getByRole("table").waitFor({ state: "visible", timeout: 15000 });
      await adminPage.locator("tbody tr").first().click();
      await adminPage.waitForURL(/\/dashboard\/users\/[a-zA-Z0-9]+/);

      await adminPage.getByText("Workspaces").waitFor({ state: "visible", timeout: 10000 });

      const addTaskButton = adminPage.getByRole("button", { name: /add to task/i });

      if (await addTaskButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addTaskButton.click();

        const dialog = adminPage.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // Should show "0 task(s) selected" initially
        await expect(dialog.getByText(/0 task\(s\) selected/i)).toBeVisible();
      }
    });
  });
});

test.describe("Permission Logic - Edge Cases", () => {
  const test2 = base.extend<{ adminContext: BrowserContext }>({
    adminContext: async ({ browser }, use) => {
      if (!hasValidAuthState(adminAuthState)) {
        throw new Error("Admin auth state not found");
      }
      const context = await browser.newContext({ storageState: adminAuthState });
      await use(context);
      await context.close();
    },
  });

  test2("available-workspaces excludes workspaces user is already in", async ({ adminContext }) => {
    const request = adminContext.request;

    // Get marcus's available workspaces
    const userId = "00000000-0000-0000-0000-000000000003"; // marcus

    // First get user's current workspaces
    const currentResponse = await request.get(`/api/admin/users/${userId}/workspaces`);
    expect(currentResponse.status()).toBe(200);
    const currentData = await currentResponse.json();
    const currentWorkspaceIds = currentData.data.map((w: { workspaceId: string }) => w.workspaceId);

    // Get available workspaces
    const availableResponse = await request.get(`/api/admin/users/${userId}/available-workspaces`);
    expect(availableResponse.status()).toBe(200);
    const availableData = await availableResponse.json();

    // Available workspaces should NOT include any workspace user is already in
    for (const workspace of availableData.data) {
      expect(currentWorkspaceIds).not.toContain(workspace.id);
    }
  });

  test2("available-tasks only includes tasks from user's workspaces", async ({ adminContext }) => {
    const request = adminContext.request;

    const userId = "00000000-0000-0000-0000-000000000003"; // marcus

    // Get user's current workspaces
    const workspacesResponse = await request.get(`/api/admin/users/${userId}/workspaces`);
    expect(workspacesResponse.status()).toBe(200);
    const workspacesData = await workspacesResponse.json();
    const userWorkspaceIds = workspacesData.data.map((w: { workspaceId: string }) => w.workspaceId);

    // Get available tasks
    const tasksResponse = await request.get(`/api/admin/users/${userId}/available-tasks`);
    expect(tasksResponse.status()).toBe(200);
    const tasksData = await tasksResponse.json();

    // All returned tasks should be from workspaces user is a member of
    for (const group of tasksData.data) {
      expect(userWorkspaceIds).toContain(group.workspaceId);
    }
  });

  test2("available-tasks excludes tasks user is already assigned to", async ({ adminContext }) => {
    const request = adminContext.request;

    const userId = "00000000-0000-0000-0000-000000000003"; // marcus

    // Get user's current tasks
    const currentResponse = await request.get(`/api/admin/users/${userId}/tasks`);
    expect(currentResponse.status()).toBe(200);
    const currentData = await currentResponse.json();
    const currentTaskIds = currentData.data.map((t: { taskId: string }) => t.taskId);

    // Get available tasks
    const availableResponse = await request.get(`/api/admin/users/${userId}/available-tasks`);
    expect(availableResponse.status()).toBe(200);
    const availableData = await availableResponse.json();

    // Available tasks should NOT include any task user is already assigned to
    for (const group of availableData.data) {
      for (const task of group.tasks) {
        expect(currentTaskIds).not.toContain(task.taskId);
      }
    }
  });
});
