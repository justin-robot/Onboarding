import { test as base, expect, Page, BrowserContext, Route } from "@playwright/test";

/**
 * Test user credentials for E2E tests
 */
export const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "testpassword123",
};

/**
 * Mock session data for authenticated tests
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
}>({
  /**
   * A page that is already authenticated with a mock session
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
});

/**
 * Helper to sign in a user for E2E tests
 */
export async function signIn(
  page: typeof base.prototype.page,
  email: string = testUser.email,
  password: string = testUser.password
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/**
 * Helper to sign up a user for E2E tests
 */
export async function signUp(
  page: typeof base.prototype.page,
  name: string = testUser.name,
  email: string = testUser.email,
  password: string = testUser.password
) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

/**
 * Helper to sign out a user for E2E tests
 */
export async function signOut(page: typeof base.prototype.page) {
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
  return cookies.some((cookie: { name: string }) => cookie.name === "better-auth.session_token");
}

/**
 * Helper to clear authentication state
 */
export async function clearAuth(context: typeof base.prototype.context) {
  await context.clearCookies();
}

export { expect };
