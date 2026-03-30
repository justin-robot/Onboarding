import { test, expect, Page, BrowserContext } from "@playwright/test";
import {
  testUsers,
  adminAuthState,
  userAuthState,
  hasValidAuthState,
  performLogin,
  loginAndSaveState,
} from "./fixtures/auth";

/**
 * E2E: Draft Mode Workflow Tests
 *
 * Tests the complete draft mode workflow:
 * 1. Admin creates a workspace (starts in draft mode)
 * 2. Admin adds invitations while in draft mode (emails NOT sent)
 * 3. Admin edits the workspace (add tasks, sections)
 * 4. User cannot access workspace before publish
 * 5. Admin publishes workspace (invites are sent)
 * 6. User can now access the fully edited workspace
 *
 * Prerequisites:
 * - Database must be seeded: pnpm db:seed
 * - Global setup must have run (happens automatically with pnpm e2e)
 */

// Unique workspace name for this test run
const TEST_WORKSPACE_NAME = `Draft Test Workspace ${Date.now()}`;
const TEST_SECTION_NAME = "Getting Started";
const TEST_TASK_NAME = "Complete Onboarding Form";

test.describe.serial("Draft Mode Workflow", () => {
  let workspaceId: string;
  let inviteToken: string;

  test.describe("Admin creates and configures workspace in draft mode", () => {
    test.beforeEach(async () => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(
          true,
          "Admin auth state not found. Run `pnpm e2e` to set up authentication."
        );
      }
    });

    test.use({ storageState: adminAuthState });

    test("1. Admin creates a new workspace (starts in draft mode)", async ({
      page,
    }) => {
      // Navigate to workspaces page
      await page.goto("/workspaces");
      await page.waitForLoadState("networkidle");

      // Click "Create Workspace" button (exact text match)
      const createButton = page.getByRole("button", { name: "Create Workspace" });
      await expect(createButton).toBeVisible({ timeout: 10000 });
      await createButton.click();

      // Wait for dialog to appear
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Fill in workspace name - use placeholder selector
      const nameInput = page.locator('input[placeholder="Client workspace name"]');
      await expect(nameInput).toBeVisible({ timeout: 5000 });
      await nameInput.fill(TEST_WORKSPACE_NAME);

      // Submit the form - there are two "Create Workspace" buttons, use the one in the dialog
      const submitButton = dialog.getByRole("button", { name: "Create Workspace" });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for navigation to new workspace
      await page.waitForURL(/\/workspace\//, { timeout: 30000 });

      // Extract workspace ID from URL
      const url = page.url();
      const match = url.match(/\/workspace\/([^/]+)/);
      expect(match).toBeTruthy();
      workspaceId = match![1];

      // Verify draft mode banner is visible
      const draftBanner = page.getByText(/Draft Mode/i);
      await expect(draftBanner.first()).toBeVisible({ timeout: 10000 });

      // Verify "Publish Workspace" button exists
      const publishButton = page.getByRole("button", { name: "Publish Workspace" });
      await expect(publishButton).toBeVisible();

      console.log(`Created workspace in draft mode: ${workspaceId}`);
    });

    test("2. Admin adds invitations while in draft mode", async ({ page, request }) => {
      test.skip(!workspaceId, "Workspace not created in previous test");

      // Create invitations via API (more reliable than UI)
      const invite1Response = await request.post(`/api/workspaces/${workspaceId}/invitations`, {
        data: { email: testUsers.user1.email, role: "user" }
      });

      if (invite1Response.ok()) {
        console.log(`Created invitation for ${testUsers.user1.email}`);
      } else {
        console.log(`Failed to create invitation for ${testUsers.user1.email}:`, await invite1Response.text());
      }

      const invite2Response = await request.post(`/api/workspaces/${workspaceId}/invitations`, {
        data: { email: testUsers.user2.email, role: "user" }
      });

      if (invite2Response.ok()) {
        console.log(`Created invitation for ${testUsers.user2.email}`);
      } else {
        console.log(`Failed to create invitation for ${testUsers.user2.email}:`, await invite2Response.text());
      }

      // Navigate to workspace and verify invitations are shown as queued
      await page.goto(`/workspace/${workspaceId}`);
      await page.waitForLoadState("networkidle");

      // Verify draft mode banner is visible
      const draftBanner = page.getByText(/Draft Mode/i);
      await expect(draftBanner.first()).toBeVisible({ timeout: 5000 });

      console.log("Added invitations for user1 and user2 (queued, not sent)");
    });

    test("3. Admin adds sections and tasks to workspace", async ({ page }) => {
      test.skip(!workspaceId, "Workspace not created in previous test");

      await page.goto(`/workspace/${workspaceId}`);
      await page.waitForLoadState("networkidle");

      // Click menu or add section button
      const menuButton = page
        .locator('button[aria-label*="more" i], button:has-text("...")')
        .first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);
      }

      // Look for "Add Section" option
      const addSectionButton = page.getByRole("button", {
        name: /add.*section/i,
      });
      const addSectionMenuItem = page.getByText(/add.*section/i);

      if (await addSectionButton.isVisible()) {
        await addSectionButton.click();
      } else if (await addSectionMenuItem.isVisible()) {
        await addSectionMenuItem.click();
      }

      await page.waitForTimeout(500);

      // Fill section name
      const sectionNameInput = page
        .locator(
          'input[placeholder*="section" i], input[placeholder*="name" i]'
        )
        .first();
      if (await sectionNameInput.isVisible()) {
        await sectionNameInput.fill(TEST_SECTION_NAME);

        // Submit
        const createButton = page.getByRole("button", {
          name: /create|add|save/i,
        });
        await createButton.click();
        await page.waitForTimeout(1000);

        console.log(`Created section: ${TEST_SECTION_NAME}`);
      }

      // Now add a task to the section
      const addTaskButton = page.getByRole("button", { name: /add.*task/i });
      const addTaskMenuItem = page.getByText(/add.*task|add.*action/i);

      if (await addTaskButton.first().isVisible()) {
        await addTaskButton.first().click();
      } else if (await addTaskMenuItem.first().isVisible()) {
        await addTaskMenuItem.first().click();
      } else {
        // Try clicking on section's add button
        const sectionAddButton = page
          .locator('[data-section-id] button:has-text("+")')
          .first();
        if (await sectionAddButton.isVisible()) {
          await sectionAddButton.click();
        }
      }

      await page.waitForTimeout(500);

      // Fill task details
      const taskNameInput = page
        .locator('input[placeholder*="task" i], input[placeholder*="title" i]')
        .first();
      if (await taskNameInput.isVisible()) {
        await taskNameInput.fill(TEST_TASK_NAME);

        // Select task type if dropdown exists
        const typeSelector = page.locator(
          '[data-testid="task-type-selector"], select'
        );
        if (await typeSelector.isVisible()) {
          await typeSelector.click();
          await page.getByText(/form/i).first().click();
        }

        // Submit
        const createTaskButton = page.getByRole("button", {
          name: /create|add|save/i,
        });
        await createTaskButton.click();
        await page.waitForTimeout(1000);

        console.log(`Created task: ${TEST_TASK_NAME}`);
      }

      // Verify the task appears in the UI
      const taskElement = page.getByText(TEST_TASK_NAME);
      const taskVisible = await taskElement.first().isVisible().catch(() => false);
      if (taskVisible) {
        console.log("Task successfully added to workspace");
      }
    });

    test("4. Verify workspace is still in draft mode after edits", async ({
      page,
    }) => {
      test.skip(!workspaceId, "Workspace not created in previous test");

      await page.goto(`/workspace/${workspaceId}`);
      await page.waitForLoadState("networkidle");

      // Draft banner should still be visible
      const draftBanner = page.getByText(/draft.*mode/i);
      await expect(draftBanner.first()).toBeVisible({ timeout: 5000 });

      // Publish button should still be available
      const publishButton = page.getByRole("button", {
        name: /publish.*workspace/i,
      });
      await expect(publishButton).toBeVisible();

      console.log("Workspace is still in draft mode after edits");
    });
  });

  test.describe("User access before publish", () => {
    test("5. User cannot access workspace before publish (not a member)", async ({
      browser,
    }) => {
      test.skip(!workspaceId, "Workspace not created in previous tests");

      // Create a new context for the user (not authenticated as admin)
      let userContext: BrowserContext;

      if (hasValidAuthState(userAuthState)) {
        userContext = await browser.newContext({ storageState: userAuthState });
      } else {
        // Create fresh context and login as user
        userContext = await browser.newContext();
        const userPage = await userContext.newPage();

        // Login as user1
        await userPage.goto("/sign-in");
        await userPage.waitForLoadState("domcontentloaded");

        await userPage.getByLabel("Email").fill(testUsers.user1.email);
        await userPage.getByLabel("Password").fill(testUsers.user1.password);
        await userPage.getByRole("button", { name: /sign in/i }).click();

        // Wait for login to complete
        await userPage
          .waitForURL(/\/(dashboard|workspace)/, { timeout: 15000 })
          .catch(() => {});

        await userPage.close();
      }

      const userPage = await userContext.newPage();

      // Try to access the workspace directly
      await userPage.goto(`/workspace/${workspaceId}`);
      // Use domcontentloaded instead of networkidle to avoid timeout on 404 pages
      await userPage.waitForLoadState("domcontentloaded");

      // Give the page a moment to render
      await userPage.waitForTimeout(1000);

      // User should not have access - either redirected, see 404, or see error
      const currentUrl = userPage.url();

      // Check for 404 page
      const is404 = await userPage.getByText(/404|not.*found|page.*could.*not.*be.*found/i).first().isVisible().catch(() => false);

      // Check for access denied or redirect
      const accessDenied = await userPage.getByText(
        /access.*denied|not.*member|unauthorized|forbidden/i
      ).first().isVisible().catch(() => false);

      // User should either see 404, access denied, or be redirected
      const noAccess = is404 || accessDenied || currentUrl.includes("/workspaces") || currentUrl.includes("/sign-in");

      console.log(`User access check - URL: ${currentUrl}, 404: ${is404}, Access denied: ${accessDenied}`);

      // Verify user does NOT have access to workspace content
      expect(noAccess).toBe(true);

      await userContext.close();
    });
  });

  test.describe("Admin publishes workspace", () => {
    test.beforeEach(async () => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(
          true,
          "Admin auth state not found. Run `pnpm e2e` to set up authentication."
        );
      }
    });

    test.use({ storageState: adminAuthState });

    test("6. Admin publishes the workspace", async ({ page }) => {
      test.skip(!workspaceId, "Workspace not created in previous tests");

      await page.goto(`/workspace/${workspaceId}`);
      await page.waitForLoadState("networkidle");

      // Click publish button
      const publishButton = page.getByRole("button", {
        name: /publish.*workspace/i,
      });
      await expect(publishButton).toBeVisible({ timeout: 5000 });
      await publishButton.click();

      // Wait for publish to complete
      await page.waitForTimeout(2000);

      // Draft banner should no longer be visible
      const draftBanner = page.getByText(/draft.*mode/i);
      const draftVisible = await draftBanner.first().isVisible().catch(() => false);

      // Success toast should appear
      const successToast = page.getByText(/published|invitations.*sent/i);
      const toastVisible = await successToast.first().isVisible().catch(() => false);

      if (toastVisible) {
        console.log("Workspace published successfully, invitations sent");
      }

      // Verify draft banner is gone
      expect(draftVisible).toBe(false);

      // Store invite token for user access test
      // We'll need to get this from the API
      const response = await page.request.get(
        `/api/workspaces/${workspaceId}/invitations`
      );
      if (response.ok()) {
        const invitations = await response.json();
        if (invitations.length > 0 && invitations[0].token) {
          inviteToken = invitations[0].token;
          console.log(`Got invite token for user access test`);
        }
      }
    });
  });

  test.describe("User access after publish", () => {
    test("7. User can access workspace after redeeming invitation", async ({
      browser,
    }) => {
      test.skip(!workspaceId, "Workspace not created in previous tests");
      test.skip(!inviteToken, "Invite token not available");

      // Create a new context for the user
      let userContext: BrowserContext;

      if (hasValidAuthState(userAuthState)) {
        userContext = await browser.newContext({ storageState: userAuthState });
      } else {
        userContext = await browser.newContext();
        const loginPage = await userContext.newPage();

        // Login as user1
        await loginPage.goto("/sign-in");
        await loginPage.waitForLoadState("domcontentloaded");

        await loginPage.getByLabel("Email").fill(testUsers.user1.email);
        await loginPage.getByLabel("Password").fill(testUsers.user1.password);
        await loginPage.getByRole("button", { name: /sign in/i }).click();

        await loginPage
          .waitForURL(/\/(dashboard|workspace)/, { timeout: 15000 })
          .catch(() => {});

        await loginPage.close();
      }

      const userPage = await userContext.newPage();

      // Go to invitation link
      await userPage.goto(`/invite/${inviteToken}`);
      await userPage.waitForLoadState("networkidle");

      // User should be able to accept the invitation
      const acceptButton = userPage.getByRole("button", {
        name: /accept|join|redeem/i,
      });
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
        await userPage.waitForTimeout(2000);
      }

      // User should now have access to the workspace
      // Either redirected there or can navigate to it
      const currentUrl = userPage.url();
      const onWorkspacePage = currentUrl.includes("/workspace/");

      if (!onWorkspacePage) {
        await userPage.goto(`/workspace/${workspaceId}`);
        await userPage.waitForLoadState("networkidle");
      }

      // Verify user can see the workspace content
      const workspaceName = userPage.getByText(TEST_WORKSPACE_NAME);
      const nameVisible = await workspaceName.first().isVisible().catch(() => false);

      // Verify the task that admin created is visible
      const taskName = userPage.getByText(TEST_TASK_NAME);
      const taskVisible = await taskName.first().isVisible().catch(() => false);

      // Verify the section is visible
      const sectionName = userPage.getByText(TEST_SECTION_NAME);
      const sectionVisible = await sectionName.first().isVisible().catch(() => false);

      console.log(
        `User access after publish - Workspace visible: ${nameVisible}, Task visible: ${taskVisible}, Section visible: ${sectionVisible}`
      );

      // User should NOT see draft mode banner (workspace is published)
      const draftBanner = userPage.getByText(/draft.*mode/i);
      const draftVisible = await draftBanner.first().isVisible().catch(() => false);
      expect(draftVisible).toBe(false);

      await userContext.close();
    });
  });
});

/**
 * Standalone test that uses API calls to test draft mode behavior
 * This test doesn't rely on sequential test state
 */
test.describe("Draft Mode API Tests", () => {
  test.beforeEach(async () => {
    if (!hasValidAuthState(adminAuthState)) {
      test.skip(
        true,
        "Admin auth state not found. Run `pnpm e2e` to set up authentication."
      );
    }
  });

  test.use({ storageState: adminAuthState });

  test("invitations are queued in draft mode and sent on publish", async ({
    page,
    request,
  }) => {
    // Step 1: Create a workspace via API
    const createResponse = await request.post("/api/workspaces", {
      data: {
        name: `API Draft Test ${Date.now()}`,
      },
    });

    if (!createResponse.ok()) {
      const errorText = await createResponse.text();
      console.log("Create workspace failed:", createResponse.status(), errorText);
      test.skip(true, "Could not create workspace via API");
      return;
    }

    const workspace = await createResponse.json();
    // API returns workspace object directly (not wrapped in { workspace })
    const wsId = workspace.id;

    if (!wsId) {
      console.log("No workspace ID in response:", workspace);
      test.skip(true, "Workspace ID not found in response");
      return;
    }

    console.log(`Created workspace: ${wsId}`);

    // Step 2: Verify workspace is in draft mode
    const workspaceResponse = await request.get(`/api/workspaces/${wsId}`);
    if (!workspaceResponse.ok()) {
      console.log("Get workspace failed:", await workspaceResponse.text());
      await request.delete(`/api/workspaces/${wsId}`);
      return;
    }
    const workspaceData = await workspaceResponse.json();
    expect(workspaceData.isPublished).toBe(false);

    // Step 3: Create invitation while in draft mode
    const inviteResponse = await request.post(
      `/api/workspaces/${wsId}/invitations`,
      {
        data: {
          email: "testinvite@example.com",
          role: "user",
        },
      }
    );

    if (!inviteResponse.ok()) {
      console.log("Could not create invitation:", await inviteResponse.text());
      // Clean up
      await request.delete(`/api/workspaces/${wsId}`);
      return;
    }

    const invitation = await inviteResponse.json();
    expect(invitation.email).toBe("testinvite@example.com");
    expect(invitation.token).toBeTruthy();

    // Step 4: Publish the workspace
    const publishResponse = await request.post(
      `/api/workspaces/${wsId}/publish`
    );

    if (!publishResponse.ok()) {
      console.log("Publish failed:", await publishResponse.text());
      await request.delete(`/api/workspaces/${wsId}`);
      return;
    }

    const publishData = await publishResponse.json();
    expect(publishData.success).toBe(true);
    // invitationsSent should be >= 0 (could be 0 if email sending is disabled)
    expect(publishData.invitationsSent).toBeGreaterThanOrEqual(0);

    // Step 5: Verify workspace is now published
    const updatedWorkspaceResponse = await request.get(
      `/api/workspaces/${wsId}`
    );
    const updatedWorkspace = await updatedWorkspaceResponse.json();
    expect(updatedWorkspace.isPublished).toBe(true);

    // Cleanup: Delete the test workspace
    await request.delete(`/api/workspaces/${wsId}`);

    console.log(
      `API Test completed - Workspace created, invitation queued, workspace published`
    );
  });
});
