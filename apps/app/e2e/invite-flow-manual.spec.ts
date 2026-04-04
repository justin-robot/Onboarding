import { test, expect } from "@playwright/test";

/**
 * Manual Invite Flow E2E Tests
 *
 * These tests require an INVITE_TOKEN environment variable to be set.
 * Run with: INVITE_TOKEN=your-token npx playwright test invite-flow-manual.spec.ts
 *
 * To get an invite token:
 * 1. Go to admin dashboard → Invitations
 * 2. Click "Copy Link" on a pending invitation
 * 3. Extract the token from the URL (after /invite/)
 */

const INVITE_TOKEN = process.env.INVITE_TOKEN;

test.describe("Invite Flow E2E (Manual Token)", () => {
  test.beforeEach(() => {
    if (!INVITE_TOKEN) {
      console.log("\n⚠️  INVITE_TOKEN not set. Run with:");
      console.log("   INVITE_TOKEN=your-token npx playwright test invite-flow-manual.spec.ts\n");
      test.skip(true, "INVITE_TOKEN environment variable required");
    }
  });

  test("API returns invitation details with accountExists", async ({ request }) => {
    const response = await request.get(`/api/invitations/${INVITE_TOKEN}`);

    console.log("\n=== API Response ===");
    console.log("Status:", response.status());

    if (!response.ok()) {
      const error = await response.json();
      console.log("Error:", error);
      test.fail(true, `API returned ${response.status()}: ${error.error}`);
      return;
    }

    const data = await response.json();
    console.log("Data:", JSON.stringify(data, null, 2));

    // Verify response structure
    expect(data).toHaveProperty("email");
    expect(data).toHaveProperty("workspaceName");
    expect(data).toHaveProperty("accountExists");
    expect(typeof data.accountExists).toBe("boolean");

    console.log("\n✅ accountExists:", data.accountExists);
    console.log("   If true → Accept should redirect to /sign-in");
    console.log("   If false → Accept should redirect to /sign-up");
  });

  test("invite page renders correctly for unauthenticated user", async ({ browser }) => {
    // Create fresh context with no cookies
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("\n=== Visiting invite page ===");
    console.log(`URL: /invite/${INVITE_TOKEN}`);

    await page.goto(`/invite/${INVITE_TOKEN}`);

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Check current URL
    const currentUrl = page.url();
    console.log("Current URL:", currentUrl);

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/manual-invite-page.png", fullPage: true });

    // Verify we're on the invite page (not redirected)
    if (currentUrl.includes("/sign-in")) {
      console.log("\n❌ FAIL: Page redirected to sign-in!");
      console.log("   This should NOT happen. The invite page should be public.");
      await context.close();
      test.fail(true, "Invite page redirected to sign-in unexpectedly");
      return;
    }

    if (currentUrl.includes("/sign-up")) {
      console.log("\n❌ FAIL: Page redirected to sign-up!");
      console.log("   This should NOT happen. The invite page should be public.");
      await context.close();
      test.fail(true, "Invite page redirected to sign-up unexpectedly");
      return;
    }

    // Check for invite page content
    const pageContent = await page.content();

    // Look for key elements
    const hasInviteTitle = pageContent.includes("You're Invited") || pageContent.includes("Invited");
    const hasAcceptButton = await page.getByRole("button", { name: /accept/i }).isVisible().catch(() => false);
    const hasDeclineButton = await page.getByRole("button", { name: /decline/i }).isVisible().catch(() => false);

    console.log("\n=== Page Elements ===");
    console.log("Has invite title:", hasInviteTitle);
    console.log("Has Accept button:", hasAcceptButton);
    console.log("Has Decline button:", hasDeclineButton);

    // Check for helper text
    const hasSignInText = await page.getByText(/sign in/i).isVisible().catch(() => false);
    const hasCreateAccountText = await page.getByText(/create an account/i).isVisible().catch(() => false);

    console.log("Has 'sign in' text:", hasSignInText);
    console.log("Has 'create account' text:", hasCreateAccountText);

    // Assertions
    expect(hasAcceptButton).toBe(true);
    expect(hasDeclineButton).toBe(true);

    await context.close();
  });

  test("clicking Accept redirects correctly based on accountExists", async ({ browser, request }) => {
    // First check what accountExists returns
    const apiResponse = await request.get(`/api/invitations/${INVITE_TOKEN}`);
    if (!apiResponse.ok()) {
      test.skip(true, "Could not fetch invitation details");
      return;
    }

    const apiData = await apiResponse.json();
    const accountExists = apiData.accountExists;

    console.log("\n=== Testing Accept redirect ===");
    console.log("accountExists:", accountExists);
    console.log("Expected redirect:", accountExists ? "/sign-in" : "/sign-up");

    // Create fresh context
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/invite/${INVITE_TOKEN}`);
    await page.waitForLoadState("networkidle");

    // Find and click Accept button
    const acceptButton = page.getByRole("button", { name: /accept/i });

    if (!await acceptButton.isVisible()) {
      console.log("\n❌ Accept button not visible!");
      await page.screenshot({ path: "e2e/screenshots/manual-no-accept-button.png", fullPage: true });
      await context.close();
      test.fail(true, "Accept button not visible on invite page");
      return;
    }

    console.log("Clicking Accept button...");
    await acceptButton.click();

    // Wait for navigation
    await page.waitForURL(/sign-in|sign-up/, { timeout: 10000 }).catch(() => {});

    const finalUrl = page.url();
    console.log("Redirected to:", finalUrl);

    // Check sessionStorage for pending token
    const storedToken = await page.evaluate(() => sessionStorage.getItem("pendingInviteToken"));
    console.log("Token in sessionStorage:", storedToken ? "✅ present" : "❌ missing");

    await page.screenshot({ path: "e2e/screenshots/manual-after-accept-click.png", fullPage: true });

    // Verify redirect matches accountExists
    if (accountExists) {
      expect(finalUrl).toContain("/sign-in");
      console.log("\n✅ Correctly redirected to sign-in (account exists)");
    } else {
      expect(finalUrl).toContain("/sign-up");
      console.log("\n✅ Correctly redirected to sign-up (account does not exist)");
    }

    expect(storedToken).toBe(INVITE_TOKEN);

    await context.close();
  });

  test("clicking Decline redirects to home", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/invite/${INVITE_TOKEN}`);
    await page.waitForLoadState("networkidle");

    const declineButton = page.getByRole("button", { name: /decline/i });

    if (!await declineButton.isVisible()) {
      await context.close();
      test.skip(true, "Decline button not visible");
      return;
    }

    console.log("\nClicking Decline button...");
    await declineButton.click();

    await page.waitForURL("/", { timeout: 10000 });

    const finalUrl = page.url();
    console.log("Redirected to:", finalUrl);

    expect(finalUrl).toBe("http://localhost:3000/");

    await context.close();
  });
});

test.describe("Debug: Check page state", () => {
  test.beforeEach(() => {
    if (!INVITE_TOKEN) {
      test.skip(true, "INVITE_TOKEN required");
    }
  });

  test("capture full page state for debugging", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on("console", msg => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    page.on("pageerror", error => {
      console.log(`[Page Error] ${error.message}`);
    });

    console.log("\n=== Debug: Full page state ===");

    await page.goto(`/invite/${INVITE_TOKEN}`);

    // Wait longer for any async operations
    await page.waitForTimeout(3000);

    const url = page.url();
    const title = await page.title();

    console.log("URL:", url);
    console.log("Title:", title);

    // Get all visible text
    const bodyText = await page.locator("body").innerText();
    console.log("\nPage text (first 500 chars):");
    console.log(bodyText.substring(0, 500));

    // Get all buttons
    const buttons = await page.getByRole("button").all();
    console.log("\nButtons on page:");
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => "[no text]");
      const visible = await btn.isVisible();
      console.log(`  - "${text}" (visible: ${visible})`);
    }

    // Take full page screenshot
    await page.screenshot({ path: "e2e/screenshots/debug-full-page.png", fullPage: true });

    await context.close();
  });
});
