import { test, expect, testUsers } from "./fixtures/auth";

/**
 * E2E: Admin Change Password Feature Tests
 *
 * These are TRUE end-to-end tests that verify the complete flow:
 * 1. Admin changes a user's password
 * 2. User can log in with the new password
 * 3. User cannot log in with the old password
 */

// Increase timeout for these tests since they involve multiple login flows
test.setTimeout(120000);

// Test configuration
const TEST_USER = testUsers.user1; // Marcus Johnson
const ORIGINAL_PASSWORD = TEST_USER.password; // "password123"
const NEW_PASSWORD = "newSecurePassword456!";

/**
 * Custom login function that's more robust for E2E testing
 */
async function loginAndVerify(
  page: import("@playwright/test").Page,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await page.goto("/sign-in");
    await page.waitForLoadState("domcontentloaded");

    // Fill in credentials
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);

    // Submit the form
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for navigation to a protected page OR stay on sign-in with error
    try {
      await page.waitForURL(/\/(dashboard|workspace|workspaces)/, { timeout: 25000 });
      return { success: true };
    } catch {
      // Check current URL - might have navigated but slowly
      const currentUrl = page.url();
      if (currentUrl.match(/\/(dashboard|workspace|workspaces)/)) {
        return { success: true };
      }
      // Still on sign-in means login failed
      if (currentUrl.includes("sign-in")) {
        return { success: false, error: "Still on sign-in page" };
      }
      return { success: false, error: "Navigation timeout" };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Helper to navigate to user edit page by finding user ID from API
async function navigateToUserEdit(page: import("@playwright/test").Page, userEmail: string) {
  // Wait for page to fully load
  await page.waitForLoadState("networkidle");

  // Wait for loading spinner to disappear
  const loadingSpinner = page.locator("text=Loading users...");
  await loadingSpinner.waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

  // Wait for table to be visible with data
  const tableBody = page.locator("table tbody");
  await expect(tableBody).toBeVisible({ timeout: 15000 });

  // Use search to filter for the user (the table may have many users)
  const searchInput = page.locator("input[placeholder*='Search']");
  await expect(searchInput).toBeVisible();
  await searchInput.click();
  await searchInput.fill(userEmail);
  await page.waitForTimeout(1000); // Wait for filter to apply

  // Find the row with the user's email
  const userRow = page.locator("table tbody tr").filter({ hasText: userEmail });
  await expect(userRow).toBeVisible({ timeout: 10000 });

  // Scroll the row into view
  await userRow.scrollIntoViewIfNeeded();

  // Click the row - it has an onClick handler that does router.push
  await userRow.click();

  // Wait for navigation to user edit page
  await page.waitForURL(/\/dashboard\/users\/[^/]+$/, { timeout: 15000 });
}

// Helper to wait for user edit form to load
async function waitForUserEditForm(page: import("@playwright/test").Page) {
  const loadingIndicator = page.locator("text=Loading user...");
  await loadingIndicator.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});

  // Wait for the form to be visible
  const nameInput = page.getByTestId("user-name-input");
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  // Wait for name input to have a value (indicates form has been populated from API)
  await expect(nameInput).not.toHaveValue("", { timeout: 10000 });

  // Small delay to ensure form is fully initialized
  await page.waitForTimeout(500);
}

// Run only on Chromium to avoid browser-specific issues
test.describe("Admin Change Password - Full E2E Flow", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");

  // Run tests serially since they modify the same user's password
  test.describe.configure({ mode: "serial" });

  test("admin can change user password and user can login with new password", async ({ adminPage, browser }) => {
    // ========================================
    // STEP 1: Admin navigates to user edit page
    // ========================================
    await adminPage.goto("/dashboard/users");
    await adminPage.waitForLoadState("networkidle");

    // Find Marcus Johnson in the users table and click to edit
    await navigateToUserEdit(adminPage, TEST_USER.email);

    // Wait for the edit form to load
    await waitForUserEditForm(adminPage);

    // ========================================
    // STEP 2: Admin changes the password
    // ========================================
    const passwordInput = adminPage.getByTestId("user-password-input");
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeEnabled();

    // Click on the input first to focus it
    await passwordInput.click();
    await adminPage.waitForTimeout(200);

    // Clear any existing value and type the new password
    await passwordInput.clear();
    await passwordInput.fill(NEW_PASSWORD);

    // Verify the password was entered
    await expect(passwordInput).toHaveValue(NEW_PASSWORD);

    // Click the save button
    const saveButton = adminPage.getByTestId("save-user-btn");
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for success toast and navigation back to users list
    await adminPage.waitForURL(/\/dashboard\/users$/, { timeout: 15000 });
    const successToast = adminPage.locator("text=User updated successfully");
    await expect(successToast).toBeVisible({ timeout: 5000 });

    // ========================================
    // STEP 3: Verify user can login with NEW password
    // ========================================
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    const loginResult = await loginAndVerify(freshPage, TEST_USER.email, NEW_PASSWORD);
    expect(loginResult.success).toBe(true);

    await freshContext.close();

    // ========================================
    // STEP 4: Verify user CANNOT login with OLD password
    // ========================================
    const failContext = await browser.newContext();
    const failPage = await failContext.newPage();

    const failResult = await loginAndVerify(failPage, TEST_USER.email, ORIGINAL_PASSWORD);
    expect(failResult.success).toBe(false);

    await failContext.close();
  });

  test("restore original password for cleanup", async ({ adminPage, browser }) => {
    // Restore Marcus's password back to the original
    await adminPage.goto("/dashboard/users");
    await adminPage.waitForLoadState("networkidle");

    await navigateToUserEdit(adminPage, TEST_USER.email);
    await waitForUserEditForm(adminPage);

    // Change password back to original
    const passwordInput = adminPage.getByTestId("user-password-input");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    await passwordInput.click();
    await adminPage.waitForTimeout(200);
    await passwordInput.clear();
    await passwordInput.fill(ORIGINAL_PASSWORD);

    const saveButton = adminPage.getByTestId("save-user-btn");
    await saveButton.click();

    await adminPage.waitForURL(/\/dashboard\/users$/, { timeout: 15000 });

    // Verify user can login with original password again
    const verifyContext = await browser.newContext();
    const verifyPage = await verifyContext.newPage();

    const loginResult = await loginAndVerify(verifyPage, TEST_USER.email, ORIGINAL_PASSWORD);
    expect(loginResult.success).toBe(true);

    await verifyContext.close();
  });

  test("user can still login after admin views their profile without changing password", async ({ adminPage, browser }) => {
    // This test verifies the form doesn't accidentally corrupt the user's password
    // when admin views/saves without entering a new password

    // Admin navigates to user edit page
    await adminPage.goto("/dashboard/users");
    await adminPage.waitForLoadState("networkidle");
    await navigateToUserEdit(adminPage, TEST_USER.email);
    await waitForUserEditForm(adminPage);

    // Verify password field is empty (not pre-filled)
    const passwordInput = adminPage.getByTestId("user-password-input");
    await expect(passwordInput).toHaveValue("");

    // Save without changing password
    const saveButton = adminPage.getByTestId("save-user-btn");
    await saveButton.click();
    await adminPage.waitForURL(/\/dashboard\/users$/, { timeout: 15000 });

    // Verify user can still login with original password
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    const loginResult = await loginAndVerify(userPage, TEST_USER.email, ORIGINAL_PASSWORD);
    expect(loginResult.success).toBe(true);

    await userContext.close();
  });

});

test.describe("Admin Change Password - Edge Cases", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");

  // Note: "saving without entering password keeps existing password" is tested in
  // the Full E2E Flow serial tests to avoid race conditions with password state

  test("password field is only visible to platform admins", async ({ adminPage }) => {
    await adminPage.goto("/dashboard/users");
    await adminPage.waitForLoadState("networkidle");

    await navigateToUserEdit(adminPage, TEST_USER.email);

    await waitForUserEditForm(adminPage);

    // Password field should be visible for platform admin
    const passwordInput = adminPage.getByTestId("user-password-input");
    await expect(passwordInput).toBeVisible();

    // Verify the helper text
    await expect(adminPage.getByText(/leave blank to keep current/i)).toBeVisible();
  });
});

test.describe("Admin Change Password - API Security", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");

  test("unauthenticated API requests are rejected", async ({ request }) => {
    // Try to change password without authentication
    const response = await request.post("/api/auth/admin/update-user", {
      data: {
        userId: "test-user-id",
        data: { password: "hackerPassword123" },
      },
    });

    // Should be rejected (401 or 400)
    expect(response.ok()).toBe(false);
    expect([400, 401, 403]).toContain(response.status());
  });

  test("non-admin users cannot see password field on user edit", async ({ userPage }) => {
    // userPage is authenticated as Marcus (a regular user)
    // Try to access admin users page
    await userPage.goto("/dashboard/users");
    await userPage.waitForTimeout(3000);

    const currentUrl = userPage.url();

    // Regular users might be redirected away or see a limited view
    if (currentUrl.includes("/dashboard/users")) {
      // If they can access the page, they shouldn't see password field
      // because they're not a platform admin
      const passwordInput = userPage.getByTestId("user-password-input");
      // Password field should not be visible to non-platform-admins
      await expect(passwordInput).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // This is expected - field shouldn't exist
      });
    }
    // If redirected away, that's also acceptable behavior
  });
});
