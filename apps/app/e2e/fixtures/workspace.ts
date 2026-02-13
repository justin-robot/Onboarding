import { test as base, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Test workspace data for E2E tests
 */
export const testWorkspaces = [
  {
    id: "ws-1",
    name: "Project Alpha",
    description: "First project workspace",
    progress: 75,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ws-2",
    name: "Project Beta",
    description: "Second project workspace",
    progress: 30,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ws-3",
    name: "Project Gamma",
    description: "Completed project",
    progress: 100,
    isCompleted: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Test workspace with sections and tasks
 */
export const workspaceWithNested = {
  id: "ws-nested",
  name: "Full Workspace",
  description: "Workspace with sections and tasks",
  sections: [
    {
      id: "section-1",
      name: "Getting Started",
      order: 0,
      tasks: [
        {
          id: "task-1",
          name: "Welcome",
          type: "welcome",
          order: 0,
          isLocked: false,
          completedAt: null,
        },
        {
          id: "task-2",
          name: "Upload Documents",
          type: "upload",
          order: 1,
          isLocked: true,
          completedAt: null,
        },
      ],
    },
    {
      id: "section-2",
      name: "Onboarding",
      order: 1,
      tasks: [
        {
          id: "task-3",
          name: "Fill Application Form",
          type: "form",
          order: 0,
          isLocked: false,
          completedAt: null,
        },
        {
          id: "task-4",
          name: "Schedule Meeting",
          type: "meeting",
          order: 1,
          isLocked: true,
          completedAt: null,
        },
      ],
    },
  ],
};

/**
 * Mock user for authenticated workspace tests
 */
export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  emailVerified: true,
};

/**
 * Helper to set up authentication for workspace tests
 */
export async function setupWorkspaceAuth(
  context: BrowserContext,
  page: Page
): Promise<void> {
  // Set up session cookie
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "mock-session-token-for-workspace-e2e",
      domain: "localhost",
      path: "/",
    },
  ]);

  // Mock session endpoint
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: mockUser }),
    });
  });
}

/**
 * Helper to mock workspace list API
 */
export async function mockWorkspaceList(
  page: Page,
  workspaces: typeof testWorkspaces = testWorkspaces
): Promise<void> {
  await page.route("**/api/workspaces", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(workspaces),
      });
    }
  });
}

/**
 * Helper to mock workspace detail API
 */
export async function mockWorkspaceDetail(
  page: Page,
  workspaceId: string,
  workspace: typeof workspaceWithNested
): Promise<void> {
  await page.route(`**/api/workspaces/${workspaceId}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(workspace),
      });
    }
  });
}

/**
 * Helper to create a workspace via API
 */
export async function createWorkspace(
  page: Page,
  data: { name: string; description?: string; dueDate?: string }
): Promise<{ id: string; name: string; description?: string }> {
  const response = await page.request.post("/api/workspaces", { data });
  return response.json();
}

/**
 * Helper to delete a workspace via API
 */
export async function deleteWorkspace(
  page: Page,
  workspaceId: string
): Promise<{ success: boolean }> {
  const response = await page.request.delete(`/api/workspaces/${workspaceId}`);
  return response.json();
}

/**
 * Extended test fixture with workspace helpers
 */
export const test = base.extend<{
  authenticatedWorkspacePage: Page;
}>({
  authenticatedWorkspacePage: async ({ page, context }, use) => {
    await setupWorkspaceAuth(context, page);
    await use(page);
  },
});

export { expect };
