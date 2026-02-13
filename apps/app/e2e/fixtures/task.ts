import { test as base, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Task types supported by the system
 */
export type TaskType =
  | "welcome"
  | "form"
  | "upload"
  | "meeting"
  | "approval"
  | "esign";

/**
 * Task status values
 */
export type TaskStatus = "not_started" | "in_progress" | "completed";

/**
 * Completion rules for tasks with multiple assignees
 */
export type CompletionRule = "any" | "all";

/**
 * Mock task data interface
 */
export interface MockTask {
  id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  completionRule: CompletionRule;
  sectionId: string;
  order: number;
  isLocked: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  dueDateType?: string;
  dueDateValue?: string;
}

/**
 * Mock assignee data
 */
export interface MockAssignee {
  id: string;
  taskId: string;
  userId: string;
  status: "pending" | "completed";
  completedAt: string | null;
}

/**
 * Test tasks for E2E tests
 */
export const testTasks: MockTask[] = [
  {
    id: "task-1",
    title: "Welcome Task",
    description: "Welcome to the workspace",
    type: "welcome",
    status: "not_started",
    completionRule: "any",
    sectionId: "section-1",
    order: 0,
    isLocked: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Upload Documents",
    description: "Upload required documents",
    type: "upload",
    status: "not_started",
    completionRule: "any",
    sectionId: "section-1",
    order: 1,
    isLocked: true,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Fill Application Form",
    description: "Complete the application form",
    type: "form",
    status: "not_started",
    completionRule: "all",
    sectionId: "section-2",
    order: 0,
    isLocked: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    title: "Schedule Meeting",
    description: "Schedule an onboarding meeting",
    type: "meeting",
    status: "not_started",
    completionRule: "any",
    sectionId: "section-2",
    order: 1,
    isLocked: true,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-5",
    title: "Manager Approval",
    description: "Requires manager approval",
    type: "approval",
    status: "not_started",
    completionRule: "all",
    sectionId: "section-3",
    order: 0,
    isLocked: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Mock user for authenticated task tests
 */
export const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  emailVerified: true,
};

/**
 * Helper to set up authentication for task tests
 */
export async function setupTaskAuth(
  context: BrowserContext,
  page: Page
): Promise<void> {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "mock-session-token-for-task-e2e",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: mockUser }),
    });
  });
}

/**
 * Helper to mock task API endpoints
 */
export async function mockTaskEndpoints(
  page: Page,
  tasks: MockTask[] = testTasks
): Promise<void> {
  const taskMap = new Map(tasks.map((t) => [t.id, { ...t }]));

  // GET /api/tasks/[id]
  await page.route("**/api/tasks/*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Extract task ID from URL
    const match = url.match(/\/api\/tasks\/([^/]+)(?:\/|$)/);
    if (!match) {
      await route.continue();
      return;
    }

    const taskId = match[1];
    const task = taskMap.get(taskId);

    if (method === "GET" && !url.includes("/complete") && !url.includes("/incomplete")) {
      if (task) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Task not found" }),
        });
      }
    } else if (method === "PUT") {
      if (task) {
        const body = route.request().postDataJSON();
        const updatedTask = { ...task, ...body, updatedAt: new Date().toISOString() };
        taskMap.set(taskId, updatedTask);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updatedTask),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Task not found" }),
        });
      }
    } else if (method === "DELETE") {
      if (task) {
        taskMap.delete(taskId);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Task not found" }),
        });
      }
    } else {
      await route.continue();
    }
  });

  // POST /api/tasks/[id]/complete
  await page.route("**/api/tasks/*/complete", async (route) => {
    const url = route.request().url();
    const taskId = url.split("/").slice(-2)[0];
    const task = taskMap.get(taskId);

    if (task) {
      if (task.isLocked) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Task is locked" }),
        });
      } else {
        const completedTask = {
          ...task,
          status: "completed" as TaskStatus,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        taskMap.set(taskId, completedTask);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(completedTask),
        });
      }
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Task not found" }),
      });
    }
  });

  // POST /api/tasks/[id]/incomplete
  await page.route("**/api/tasks/*/incomplete", async (route) => {
    const url = route.request().url();
    const taskId = url.split("/").slice(-2)[0];
    const task = taskMap.get(taskId);

    if (task) {
      const incompleteTask = {
        ...task,
        status: "not_started" as TaskStatus,
        completedAt: null,
        updatedAt: new Date().toISOString(),
      };
      taskMap.set(taskId, incompleteTask);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(incompleteTask),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Task not found" }),
      });
    }
  });
}

/**
 * Helper to complete a task via API
 */
export async function completeTask(
  page: Page,
  taskId: string
): Promise<MockTask> {
  const response = await page.request.post(`/api/tasks/${taskId}/complete`);
  return response.json();
}

/**
 * Helper to mark a task incomplete via API
 */
export async function markTaskIncomplete(
  page: Page,
  taskId: string
): Promise<MockTask> {
  const response = await page.request.post(`/api/tasks/${taskId}/incomplete`);
  return response.json();
}

/**
 * Helper to get task details via API
 */
export async function getTask(page: Page, taskId: string): Promise<MockTask> {
  const response = await page.request.get(`/api/tasks/${taskId}`);
  return response.json();
}

/**
 * Helper to update task via API
 */
export async function updateTask(
  page: Page,
  taskId: string,
  updates: Partial<MockTask>
): Promise<MockTask> {
  const response = await page.request.put(`/api/tasks/${taskId}`, {
    data: updates,
  });
  return response.json();
}

/**
 * Extended test fixture with task helpers
 */
export const test = base.extend<{
  authenticatedTaskPage: Page;
}>({
  authenticatedTaskPage: async ({ page, context }, use) => {
    await setupTaskAuth(context, page);
    await use(page);
  },
});

export { expect };
