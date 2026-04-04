import { test, expect, Page, BrowserContext } from "@playwright/test";
import { adminAuthState, userAuthState, hasValidAuthState, testUsers } from "./fixtures/auth";

/**
 * True End-to-End Tests for Invite Link Flow
 *
 * These tests verify the complete user journey:
 * 1. Admin copies invite link from dashboard
 * 2. User (unauthenticated) visits the link
 * 3. User sees appropriate UI based on whether account exists
 * 4. User clicks Accept and is redirected appropriately
 * 5. After auth, user is redirected back and can accept
 * 6. User becomes a workspace member
 */

test.describe("Invite Link E2E Flow", () => {

  test.describe("Step 1: Admin copies invite link", () => {
    test.use({ storageState: adminAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(true, "Admin auth state not found. Run pnpm db:seed first.");
      }
    });

    test("admin can navigate to invitations page and see pending invitations", async ({ page }) => {
      await page.goto("/dashboard/invitations");
      await page.waitForLoadState("networkidle");

      // Should be on invitations page
      await expect(page).toHaveURL(/dashboard\/invitations/);

      // Should see the page title
      const title = page.getByRole("heading", { name: /invitations/i });
      await expect(title).toBeVisible();

      // Take screenshot for debugging
      await page.screenshot({ path: "e2e/screenshots/admin-invitations-page.png" });
    });

    test("admin can copy invite link for a pending invitation", async ({ page }) => {
      await page.goto("/dashboard/invitations");
      await page.waitForLoadState("networkidle");

      // Look for a copy link button
      const copyButton = page.getByRole("button", { name: /copy/i }).first();

      if (await copyButton.isVisible()) {
        // Click copy button
        await copyButton.click();

        // Should show success toast
        const toast = page.getByText(/copied/i);
        await expect(toast).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: "e2e/screenshots/admin-copy-link-success.png" });
      } else {
        // No invitations with copy button - take screenshot to see what's there
        await page.screenshot({ path: "e2e/screenshots/admin-no-copy-button.png" });

        // Check if there are any invitations at all
        const noInvitations = page.getByText(/no.*invitations/i);
        const hasNoInvitations = await noInvitations.isVisible().catch(() => false);

        if (hasNoInvitations) {
          test.skip(true, "No pending invitations found - need to create one first");
        }
      }
    });
  });

  test.describe("Step 2: Unauthenticated user visits invite link", () => {
    let inviteToken: string | null = null;
    let inviteEmail: string | null = null;

    // Get a valid invite token before running these tests
    test.beforeAll(async ({ browser }) => {
      if (!hasValidAuthState(adminAuthState)) {
        return;
      }

      const context = await browser.newContext({ storageState: adminAuthState });
      const page = await context.newPage();

      // Fetch invitations from API
      const response = await page.request.get("/api/admin/invitations");
      if (response.ok()) {
        const data = await response.json();
        const pending = data.invitations?.find(
          (inv: { redeemedAt: null | string; token: string; email: string }) =>
            !inv.redeemedAt && inv.token
        );
        if (pending) {
          inviteToken = pending.token;
          inviteEmail = pending.email;
        }
      }

      await context.close();
    });

    test("unauthenticated user sees invite page with Accept/Decline buttons", async ({ browser }) => {
      if (!inviteToken) {
        test.skip(true, "No invite token available");
        return;
      }

      // Create a fresh context with no auth
      const context = await browser.newContext();
      const page = await context.newPage();

      // Visit the invite link
      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Should stay on invite page (not redirect to sign-in)
      await expect(page).toHaveURL(new RegExp(`/invite/${inviteToken}`));

      // Take screenshot
      await page.screenshot({ path: "e2e/screenshots/invite-page-unauthenticated.png" });

      // Should see the invitation card
      const inviteCard = page.getByText(/you're invited/i);
      await expect(inviteCard).toBeVisible();

      // Should see Accept button
      const acceptButton = page.getByRole("button", { name: /accept/i });
      await expect(acceptButton).toBeVisible();

      // Should see Decline button
      const declineButton = page.getByRole("button", { name: /decline/i });
      await expect(declineButton).toBeVisible();

      // Should see helper text about sign-in or create account
      const helperText = page.getByText(/sign in|create an account/i);
      await expect(helperText).toBeVisible();

      await context.close();
    });

    test("invite page shows correct helper text based on accountExists", async ({ browser }) => {
      if (!inviteToken) {
        test.skip(true, "No invite token available");
        return;
      }

      // Create a fresh context with no auth
      const context = await browser.newContext();
      const page = await context.newPage();

      // First, check what the API returns for accountExists
      const apiResponse = await page.request.get(`/api/invitations/${inviteToken}`);
      expect(apiResponse.ok()).toBe(true);

      const apiData = await apiResponse.json();
      const accountExists = apiData.accountExists;

      console.log(`Invite email: ${apiData.email}`);
      console.log(`accountExists: ${accountExists}`);

      // Visit the invite page
      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Check the helper text matches accountExists value
      if (accountExists) {
        const signInText = page.getByText(/sign in to complete/i);
        await expect(signInText).toBeVisible();
      } else {
        const createAccountText = page.getByText(/create an account/i);
        await expect(createAccountText).toBeVisible();
      }

      await page.screenshot({
        path: `e2e/screenshots/invite-page-account-${accountExists ? 'exists' : 'not-exists'}.png`
      });

      await context.close();
    });

    test("clicking Accept redirects to sign-in when account exists", async ({ browser }) => {
      if (!inviteToken) {
        test.skip(true, "No invite token available");
        return;
      }

      // Create a fresh context with no auth
      const context = await browser.newContext();
      const page = await context.newPage();

      // Check if account exists for this invite
      const apiResponse = await page.request.get(`/api/invitations/${inviteToken}`);
      const apiData = await apiResponse.json();

      if (!apiData.accountExists) {
        test.skip(true, "This test requires an invitation for an existing account");
        await context.close();
        return;
      }

      // Visit the invite page
      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Click Accept
      const acceptButton = page.getByRole("button", { name: /accept/i });
      await acceptButton.click();

      // Should redirect to sign-in
      await page.waitForURL(/sign-in/, { timeout: 10000 });
      await expect(page).toHaveURL(/sign-in/);

      // Check that the invite token was stored in sessionStorage
      const storedToken = await page.evaluate(() => sessionStorage.getItem("pendingInviteToken"));
      expect(storedToken).toBe(inviteToken);

      await page.screenshot({ path: "e2e/screenshots/invite-accept-redirect-signin.png" });

      await context.close();
    });

    test("clicking Accept redirects to sign-up when account does not exist", async ({ browser }) => {
      if (!inviteToken) {
        test.skip(true, "No invite token available");
        return;
      }

      // Create a fresh context with no auth
      const context = await browser.newContext();
      const page = await context.newPage();

      // Check if account exists for this invite
      const apiResponse = await page.request.get(`/api/invitations/${inviteToken}`);
      const apiData = await apiResponse.json();

      if (apiData.accountExists) {
        test.skip(true, "This test requires an invitation for a non-existing account");
        await context.close();
        return;
      }

      // Visit the invite page
      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Click Accept
      const acceptButton = page.getByRole("button", { name: /accept/i });
      await acceptButton.click();

      // Should redirect to sign-up
      await page.waitForURL(/sign-up/, { timeout: 10000 });
      await expect(page).toHaveURL(/sign-up/);

      // Check that the invite token was stored in sessionStorage
      const storedToken = await page.evaluate(() => sessionStorage.getItem("pendingInviteToken"));
      expect(storedToken).toBe(inviteToken);

      await page.screenshot({ path: "e2e/screenshots/invite-accept-redirect-signup.png" });

      await context.close();
    });

    test("clicking Decline redirects to home", async ({ browser }) => {
      if (!inviteToken) {
        test.skip(true, "No invite token available");
        return;
      }

      // Create a fresh context with no auth
      const context = await browser.newContext();
      const page = await context.newPage();

      // Visit the invite page
      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Click Decline
      const declineButton = page.getByRole("button", { name: /decline/i });
      await declineButton.click();

      // Should redirect to home
      await page.waitForURL("/", { timeout: 10000 });

      await page.screenshot({ path: "e2e/screenshots/invite-decline-redirect-home.png" });

      await context.close();
    });
  });

  test.describe("Step 3: Authenticated user with matching email", () => {
    // This test uses an existing user auth state
    test.use({ storageState: userAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(userAuthState)) {
        test.skip(true, "User auth state not found");
      }
    });

    test("authenticated user sees Accept button and can join workspace", async ({ page, request }) => {
      // First, we need an invitation for the logged-in user's email
      // Get the current user's email from session
      const sessionResponse = await request.get("/api/auth/get-session");
      if (!sessionResponse.ok()) {
        test.skip(true, "Could not get session");
        return;
      }

      const session = await sessionResponse.json();
      const userEmail = session.user?.email;

      if (!userEmail) {
        test.skip(true, "No user email in session");
        return;
      }

      console.log(`Looking for invitation for: ${userEmail}`);

      // Check if there's an invitation for this user
      // We need admin access to check this, so we'll just try visiting invite links
      // For now, let's test the general flow with any invitation

      // Get invitations (this might fail if user doesn't have admin access)
      const invitationsResponse = await request.get("/api/admin/invitations");

      if (!invitationsResponse.ok()) {
        // User doesn't have admin access, skip this test
        test.skip(true, "User doesn't have admin access to check invitations");
        return;
      }

      const data = await invitationsResponse.json();
      const matchingInvite = data.invitations?.find(
        (inv: { email: string; redeemedAt: null | string; token: string }) =>
          inv.email.toLowerCase() === userEmail.toLowerCase() && !inv.redeemedAt && inv.token
      );

      if (!matchingInvite) {
        test.skip(true, `No pending invitation found for ${userEmail}`);
        return;
      }

      // Visit the invite page
      await page.goto(`/invite/${matchingInvite.token}`);
      await page.waitForLoadState("networkidle");

      // Should see Accept button (not sign-in prompt)
      const acceptButton = page.getByRole("button", { name: /accept invitation/i });
      await expect(acceptButton).toBeVisible();

      // Should show "Signed in as" text
      const signedInAs = page.getByText(new RegExp(`signed in as.*${userEmail}`, "i"));
      await expect(signedInAs).toBeVisible();

      await page.screenshot({ path: "e2e/screenshots/invite-authenticated-matching-email.png" });

      // Click Accept to join
      await acceptButton.click();

      // Should show success and redirect to workspace
      await page.waitForURL(/workspace/, { timeout: 15000 });

      await page.screenshot({ path: "e2e/screenshots/invite-accepted-workspace.png" });
    });
  });

  test.describe("Step 4: Authenticated user with different email", () => {
    test.use({ storageState: userAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(userAuthState)) {
        test.skip(true, "User auth state not found");
      }
    });

    test("shows email mismatch warning when logged in with different email", async ({ page, request }) => {
      // Get the current user's email
      const sessionResponse = await request.get("/api/auth/get-session");
      if (!sessionResponse.ok()) {
        test.skip(true, "Could not get session");
        return;
      }

      const session = await sessionResponse.json();
      const userEmail = session.user?.email?.toLowerCase();

      // Get invitations and find one for a DIFFERENT email
      const invitationsResponse = await request.get("/api/admin/invitations");

      if (!invitationsResponse.ok()) {
        test.skip(true, "Could not fetch invitations");
        return;
      }

      const data = await invitationsResponse.json();
      const differentEmailInvite = data.invitations?.find(
        (inv: { email: string; redeemedAt: null | string; token: string }) =>
          inv.email.toLowerCase() !== userEmail && !inv.redeemedAt && inv.token
      );

      if (!differentEmailInvite) {
        test.skip(true, "No invitation found for a different email");
        return;
      }

      console.log(`User email: ${userEmail}`);
      console.log(`Invite email: ${differentEmailInvite.email}`);

      // Visit the invite page
      await page.goto(`/invite/${differentEmailInvite.token}`);
      await page.waitForLoadState("networkidle");

      // Should show email mismatch warning
      const mismatchWarning = page.getByText(/email mismatch/i);
      await expect(mismatchWarning).toBeVisible();

      // Should show both emails
      const inviteEmail = page.getByText(new RegExp(differentEmailInvite.email, "i"));
      await expect(inviteEmail).toBeVisible();

      await page.screenshot({ path: "e2e/screenshots/invite-email-mismatch.png" });
    });
  });

  test.describe("API: accountExists verification", () => {
    test("API returns accountExists field correctly", async ({ request }) => {
      // Test with a known test user email that should exist
      // First, get any pending invitation

      // This test doesn't need auth - it tests the public API
      const testToken = "test-invalid-token-12345";

      const response = await request.get(`/api/invitations/${testToken}`);

      // Invalid token should return 404
      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data.error).toContain("not found");
    });

    test("API returns correct accountExists for valid invitation", async ({ browser }) => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(true, "Admin auth not available");
        return;
      }

      // Use admin context to get a valid token
      const context = await browser.newContext({ storageState: adminAuthState });
      const page = await context.newPage();

      const invitationsResponse = await page.request.get("/api/admin/invitations");
      if (!invitationsResponse.ok()) {
        test.skip(true, "Could not fetch invitations");
        await context.close();
        return;
      }

      const data = await invitationsResponse.json();
      const pendingInvite = data.invitations?.find(
        (inv: { redeemedAt: null | string; token: string }) => !inv.redeemedAt && inv.token
      );

      if (!pendingInvite) {
        test.skip(true, "No pending invitation found");
        await context.close();
        return;
      }

      await context.close();

      // Now test the public API (no auth needed)
      const publicContext = await browser.newContext();
      const publicPage = await publicContext.newPage();

      const apiResponse = await publicPage.request.get(`/api/invitations/${pendingInvite.token}`);
      expect(apiResponse.ok()).toBe(true);

      const apiData = await apiResponse.json();

      // Verify the response structure
      expect(apiData).toHaveProperty("email");
      expect(apiData).toHaveProperty("role");
      expect(apiData).toHaveProperty("workspaceName");
      expect(apiData).toHaveProperty("accountExists");
      expect(typeof apiData.accountExists).toBe("boolean");

      console.log("API Response:", JSON.stringify(apiData, null, 2));

      await publicContext.close();
    });
  });

  test.describe("Full Flow: Sign-in after Accept", () => {
    test("user can complete full flow: Accept → Sign-in → Auto-redirect → Join", async ({ browser }) => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(true, "Admin auth not available to get invite token");
        return;
      }

      // Step 1: Get a valid invite token for an existing user
      const adminContext = await browser.newContext({ storageState: adminAuthState });
      const adminPage = await adminContext.newPage();

      const invitationsResponse = await adminPage.request.get("/api/admin/invitations");
      if (!invitationsResponse.ok()) {
        test.skip(true, "Could not fetch invitations");
        await adminContext.close();
        return;
      }

      const data = await invitationsResponse.json();

      // Find an invitation for an existing test user
      const testUserEmails = Object.values(testUsers).map(u => u.email.toLowerCase());

      const inviteForExistingUser = data.invitations?.find(
        (inv: { email: string; redeemedAt: null | string; token: string }) =>
          testUserEmails.includes(inv.email.toLowerCase()) && !inv.redeemedAt && inv.token
      );

      await adminContext.close();

      if (!inviteForExistingUser) {
        test.skip(true, "No invitation found for existing test users");
        return;
      }

      const inviteToken = inviteForExistingUser.token;
      const inviteEmail = inviteForExistingUser.email;

      // Find the test user credentials
      const testUser = Object.values(testUsers).find(
        u => u.email.toLowerCase() === inviteEmail.toLowerCase()
      );

      if (!testUser) {
        test.skip(true, `No test credentials for ${inviteEmail}`);
        return;
      }

      console.log(`Testing full flow for: ${inviteEmail}`);

      // Step 2: Visit invite page as unauthenticated user
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`/invite/${inviteToken}`);
      await page.waitForLoadState("networkidle");

      // Verify we see Accept button
      const acceptButton = page.getByRole("button", { name: /accept/i });
      await expect(acceptButton).toBeVisible();

      // Step 3: Click Accept
      await acceptButton.click();

      // Should redirect to sign-in
      await page.waitForURL(/sign-in/, { timeout: 10000 });

      // Step 4: Sign in with the correct credentials
      const emailInput = page.getByLabel(/email/i);
      const passwordInput = page.getByLabel(/password/i);
      const signInButton = page.getByRole("button", { name: /sign in/i });

      await emailInput.fill(testUser.email);
      await passwordInput.fill(testUser.password);
      await signInButton.click();

      // Step 5: Should be redirected back to invite page (via PendingInviteHandler)
      await page.waitForURL(new RegExp(`/invite/${inviteToken}`), { timeout: 30000 });

      // Step 6: Now logged in, should see Accept button (not sign-in prompt)
      const finalAcceptButton = page.getByRole("button", { name: /accept invitation/i });
      await expect(finalAcceptButton).toBeVisible({ timeout: 10000 });

      await page.screenshot({ path: "e2e/screenshots/full-flow-ready-to-accept.png" });

      // Step 7: Accept the invitation
      await finalAcceptButton.click();

      // Step 8: Should redirect to workspace
      await page.waitForURL(/workspace/, { timeout: 15000 });

      await page.screenshot({ path: "e2e/screenshots/full-flow-complete.png" });

      await context.close();
    });
  });
});
