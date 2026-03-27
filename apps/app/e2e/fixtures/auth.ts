import { test as base, expect, Page, BrowserContext, Route } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Test user credentials - these match the seeded database users
 * See: packages/database/seeds/seed.ts
 */
export const testUsers = {
  admin: {
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  },
  accountManager: {
    name: "Sarah Chen",
    email: "sarah@example.com",
    password: "password123",
    role: "user",
  },
  user1: {
    name: "Marcus Johnson",
    email: "marcus@example.com",
    password: "password123",
    role: "user",
  },
  user2: {
    name: "Emily Rivera",
    email: "emily@example.com",
    password: "password123",
    role: "user",
  },
};

// Alias for backwards compatibility
export const testUser = testUsers.admin;

/**
 * Storage state file paths for authenticated sessions
 */
export const authStateDir = path.join(__dirname, "../.auth");
export const adminAuthState = path.join(authStateDir, "admin.json");
export const userAuthState = path.join(authStateDir, "user.json");

/**
 * Check if auth state file exists and is valid
 */
export function hasValidAuthState(statePath: string): boolean {
  if (!fs.existsSync(statePath)) return false;
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    // Check if cookies exist and at least one has a session token
    return state.cookies?.some((c: { name: string }) =>
      c.name.includes("session") || c.name.includes("auth")
    );
  } catch {
    return false;
  }
}

/**
 * Mock session data for tests that only need basic auth mocking
 * (useful for unit-style tests that don't need full authentication)
 */
export const mockSession = {
  user: {
    id: "test-user-id",
    email: testUser.email,
    name: testUser.name,
    emailVerified: true,
    image: null,
  },
};

/**
 * Extended test fixture with authentication helpers
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  userPage: Page;
}>({
  /**
   * A page that is authenticated using mocked session (for unit-style tests)
   */
  authenticatedPage: async ({ page, context }: { page: Page; context: BrowserContext }, use: (page: Page) => Promise<void>) => {
    // Set up mock session cookie
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "mock-session-token-for-e2e-tests",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Mock session validation endpoint
    await page.route("**/api/auth/session", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await use(page);
  },

  /**
   * A page that is authenticated as admin (requires setup to have run first)
   */
  adminPage: async ({ browser }, use) => {
    if (!hasValidAuthState(adminAuthState)) {
      throw new Error(
        "Admin auth state not found. Run `pnpm e2e:setup` or login manually first."
      );
    }
    const context = await browser.newContext({ storageState: adminAuthState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  /**
   * A page that is authenticated as a regular user (requires setup to have run first)
   */
  userPage: async ({ browser }, use) => {
    if (!hasValidAuthState(userAuthState)) {
      throw new Error(
        "User auth state not found. Run `pnpm e2e:setup` or login manually first."
      );
    }
    const context = await browser.newContext({ storageState: userAuthState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

/**
 * Helper to perform real sign in through the UI
 * This creates a real authenticated session that works with server-side validation
 */
export async function performLogin(
  page: Page,
  email: string = testUser.email,
  password: string = testUser.password
): Promise<boolean> {
  try {
    await page.goto("/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // Fill in credentials
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation to dashboard or workspace
    await page.waitForURL(/\/(dashboard|workspace)/, { timeout: 30000 });

    return true;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

/**
 * Helper to sign in and save storage state for reuse
 */
export async function loginAndSaveState(
  page: Page,
  email: string,
  password: string,
  statePath: string
): Promise<boolean> {
  // Ensure auth directory exists
  if (!fs.existsSync(authStateDir)) {
    fs.mkdirSync(authStateDir, { recursive: true });
  }

  const success = await performLogin(page, email, password);

  if (success) {
    // Save storage state for future test runs
    await page.context().storageState({ path: statePath });
    console.log(`Auth state saved to: ${statePath}`);
  }

  return success;
}

/**
 * Helper to sign in a user for E2E tests (original signature for backwards compatibility)
 */
export async function signIn(
  page: Page,
  email: string = testUser.email,
  password: string = testUser.password
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

/**
 * Helper to sign up a user for E2E tests
 */
export async function signUp(
  page: Page,
  name: string = testUser.name,
  email: string = testUser.email,
  password: string = testUser.password
) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();
}

/**
 * Helper to sign out a user for E2E tests
 */
export async function signOut(page: Page) {
  // Look for sign out button/link in the UI
  const signOutButton = page.getByRole("button", { name: /sign out|log out/i });
  if (await signOutButton.isVisible()) {
    await signOutButton.click();
  }
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((cookie: { name: string }) =>
    cookie.name.includes("session") || cookie.name.includes("auth")
  );
}

/**
 * Helper to clear authentication state
 */
export async function clearAuth(context: BrowserContext) {
  await context.clearCookies();
}

/**
 * Wait for auth redirect to complete (useful after login)
 */
export async function waitForAuthRedirect(page: Page, expectedPath?: string) {
  if (expectedPath) {
    await page.waitForURL(`**${expectedPath}**`, { timeout: 30000 });
  } else {
    await page.waitForURL(/\/(dashboard|workspace)/, { timeout: 30000 });
  }
}

export { expect };
