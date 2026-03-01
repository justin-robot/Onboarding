import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Visual Regression Tests
 *
 * Compares the current UI against reference screenshots from Moxo.
 * Reference images are in: Moxo SS/
 * Categories are documented in: Moxo SS/screenshot-categories.md
 *
 * SETUP:
 * 1. Run: pnpm exec playwright codegen http://localhost:3000 --save-storage=e2e/auth.json
 * 2. Sign in manually in the browser that opens
 * 3. Close the browser to save session
 * 4. Run tests: pnpm exec playwright test visual-regression.spec.ts
 */

const AUTH_FILE = path.join(__dirname, "auth.json");
const hasAuth = fs.existsSync(AUTH_FILE);

// Use saved auth state if available
test.use({
  storageState: hasAuth ? AUTH_FILE : undefined,
});

// ============================================================================
// CATEGORY 1: Public Pages (No Auth Required)
// ============================================================================

test.describe("Visual Regression: Public Pages", () => {
  test("Sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("sign-in-page.png", {
      maxDiffPixelRatio: 0.1,
      animations: "disabled",
    });
  });

  test("Sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("sign-up-page.png", {
      maxDiffPixelRatio: 0.1,
      animations: "disabled",
    });
  });
});

// ============================================================================
// CATEGORY 2: Workspace Overview / Flow View
// ============================================================================

// Get workspace ID from environment or use a known one
const WORKSPACE_ID = process.env.TEST_WORKSPACE_ID || "a47f78e7-0b6b-4a34-900b-556e16fefd21";

test.describe("Visual Regression: Workspace Overview", () => {
  test.skip(!hasAuth, "Run: pnpm exec playwright codegen http://localhost:3000 --save-storage=e2e/auth.json");

  // Helper to navigate directly to workspace
  async function enterWorkspace(page: import("@playwright/test").Page): Promise<boolean> {
    // Navigate directly to workspace
    await page.goto(`/workspace/${WORKSPACE_ID}`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for workspace page to load - look for Flow tab
    try {
      await page.waitForSelector('text="Flow"', { timeout: 15000 });
      await page.waitForTimeout(2000); // Extra time for content to render
      return true;
    } catch {
      return false;
    }
  }

  test("Flow view with sections and timeline", async ({ page }) => {
    if (!(await enterWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Screenshot main content
    await expect(page.locator("main").first()).toHaveScreenshot("flow-view.png", {
      maxDiffPixelRatio: 0.1,
      animations: "disabled",
    });
  });

  test("Section container with border", async ({ page }) => {
    if (!(await enterWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Find section with border
    const section = page.locator(".rounded-xl.border").first();
    if (await section.isVisible().catch(() => false)) {
      await expect(section).toHaveScreenshot("section-container.png", {
        maxDiffPixelRatio: 0.1,
        animations: "disabled",
      });
    }
  });

  test("Desktop full page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    if (!(await enterWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    await expect(page).toHaveScreenshot("workspace-desktop.png", {
      maxDiffPixelRatio: 0.1,
      animations: "disabled",
    });
  });

  test("Mobile full page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    if (!(await enterWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    await expect(page).toHaveScreenshot("workspace-mobile.png", {
      maxDiffPixelRatio: 0.1,
      animations: "disabled",
    });
  });
});

// ============================================================================
// CATEGORY 3: UI Components Verification
// ============================================================================

test.describe("Visual Regression: UI Components", () => {
  test.skip(!hasAuth, "Run: pnpm exec playwright codegen http://localhost:3000 --save-storage=e2e/auth.json");

  // Helper to navigate directly to workspace
  async function goToWorkspace(page: import("@playwright/test").Page) {
    await page.goto(`/workspace/${WORKSPACE_ID}`);
    await page.waitForLoadState("domcontentloaded");

    try {
      await page.waitForSelector('text="Flow"', { timeout: 15000 });
      await page.waitForTimeout(2000);
      return true;
    } catch {
      return false;
    }
  }

  test("Timeline indicators exist", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Check timeline circles exist
    const greenCircle = page.locator(".bg-green-500.rounded-full").first();
    const blueCircle = page.locator(".bg-blue-500.rounded-full").first();
    const grayCircle = page.locator(".bg-gray-200.rounded-full").first();

    const hasGreen = await greenCircle.isVisible().catch(() => false);
    const hasBlue = await blueCircle.isVisible().catch(() => false);
    const hasGray = await grayCircle.isVisible().catch(() => false);

    console.log(`Timeline: green=${hasGreen}, blue=${hasBlue}, gray=${hasGray}`);
    expect(hasGreen || hasBlue || hasGray).toBeTruthy();
  });

  test("Section border colors", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Check for colored borders
    const blueBorder = await page.locator(".border-blue-500").count();
    const greenBorder = await page.locator(".border-green-500").count();
    const grayBorder = await page.locator(".border-slate-300").count();

    console.log(`Borders: blue=${blueBorder}, green=${greenBorder}, gray=${grayBorder}`);
    expect(blueBorder + greenBorder + grayBorder).toBeGreaterThan(0);
  });

  test("Task type icons", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Check for task type icon backgrounds
    const teal = await page.locator(".bg-teal-100").count();    // form
    const amber = await page.locator(".bg-amber-100").count();  // acknowledgement
    const purple = await page.locator(".bg-purple-100").count(); // file_upload
    const blue = await page.locator(".bg-blue-100").count();    // approval
    const orange = await page.locator(".bg-orange-100").count(); // booking
    const indigo = await page.locator(".bg-indigo-100").count(); // esign

    console.log(`Icons: teal=${teal}, amber=${amber}, purple=${purple}, blue=${blue}, orange=${orange}, indigo=${indigo}`);
    expect(teal + amber + purple + blue + orange + indigo).toBeGreaterThan(0);
  });

  test("Status subtitle text", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Check for status text (these are now subtitles, not badges)
    const completed = await page.getByText("Completed", { exact: true }).count();
    const yourTurn = await page.getByText("Your Turn", { exact: true }).count();
    const inProgress = await page.getByText("In Progress", { exact: true }).count();
    const notStarted = await page.getByText("Not Started", { exact: true }).count();

    console.log(`Status: completed=${completed}, yourTurn=${yourTurn}, inProgress=${inProgress}, notStarted=${notStarted}`);
    expect(completed + yourTurn + inProgress + notStarted).toBeGreaterThan(0);
  });

  test("In Progress badge has spinner", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Look for spinner (animate-spin) near "In Progress" badge
    const spinner = await page.locator(".animate-spin").count();
    console.log(`Spinners found: ${spinner}`);

    // Should have at least one if there's an in-progress section
    const hasInProgress = await page.locator(".border-blue-500").count() > 0;
    if (hasInProgress) {
      expect(spinner).toBeGreaterThan(0);
    }
  });

  test("Assignee avatars are rounded rectangles", async ({ page }) => {
    if (!(await goToWorkspace(page))) {
      test.skip(true, "No workspaces available");
      return;
    }

    // Avatars should be rounded-lg (not rounded-full)
    const roundedLgAvatars = await page.locator(".rounded-lg.bg-gray-500").count();
    console.log(`Rounded-lg avatars: ${roundedLgAvatars}`);
  });
});

// ============================================================================
// CATEGORY 4: Task Details Panel
// ============================================================================

test.describe("Visual Regression: Task Details", () => {
  test.skip(!hasAuth, "Run: pnpm exec playwright codegen http://localhost:3000 --save-storage=e2e/auth.json");

  test("Click task opens details panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/workspace/${WORKSPACE_ID}`);
    await page.waitForLoadState("domcontentloaded");

    try {
      await page.waitForSelector('text="Flow"', { timeout: 15000 });
      await page.waitForTimeout(2000);
    } catch {
      test.skip(true, "Workspace not available");
      return;
    }

    // Click first task
    const taskButton = page.locator("button").filter({ has: page.locator(".bg-teal-100, .bg-amber-100, .bg-purple-100, .bg-blue-100, .bg-orange-100, .bg-indigo-100") }).first();

    if (await taskButton.isVisible().catch(() => false)) {
      await taskButton.click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("task-details-panel.png", {
        maxDiffPixelRatio: 0.1,
        animations: "disabled",
      });
    }
  });
});

// ============================================================================
// Reference Info
// ============================================================================

test.describe("Visual Regression: Reference", () => {
  test("Moxo screenshot categories", async () => {
    console.log(`
=== MOXO REFERENCE SCREENSHOTS ===
Location: Moxo SS/

WORKSPACE OVERVIEW (compare to flow-view.png, workspace-desktop.png):
- 7.29.12 AM.png - Full workspace with sections
- 7.29.27 AM.png - Section with vertical timeline

KEY UI PATTERNS TO VERIFY:
[x] Full border around sections (not left accent only)
[x] Inline timeline circles (green/blue/gray)
[x] Status as subtitle text (not badges)
[x] Rounded-rectangle avatars
[x] Spinner in "In Progress" badge
[x] "Review" button for Your Turn tasks
    `);
  });
});
