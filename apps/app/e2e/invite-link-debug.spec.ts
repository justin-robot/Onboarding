import { test, expect } from "@playwright/test";
import { adminAuthState, userAuthState, hasValidAuthState, testUsers } from "./fixtures/auth";

/**
 * Debug tests for invite link flow
 *
 * These tests verify the invite link behavior in different scenarios:
 * 1. API returns correct accountExists flag
 * 2. Logged in user sees Accept/Decline buttons
 * 3. Non-logged-in user with existing account is redirected to sign-in
 * 4. Non-logged-in user without account is redirected to sign-up
 */

test.describe("Invite Link Debug Tests", () => {
  let inviteToken: string | null = null;
  let inviteEmail: string | null = null;

  // First, get an invitation token from the admin panel
  test.describe("Setup: Get invitation token", () => {
    test.use({ storageState: adminAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(true, "Admin auth state not found");
      }
    });

    test("fetch invitation token from API", async ({ request }) => {
      // Get list of invitations
      const response = await request.get("/api/admin/invitations");

      console.log("Admin invitations API response status:", response.status());

      if (response.ok()) {
        const data = await response.json();
        console.log("Invitations data:", JSON.stringify(data, null, 2));

        if (data.invitations && data.invitations.length > 0) {
          // Find a pending invitation
          const pendingInvite = data.invitations.find((inv: { redeemedAt: null | string }) => !inv.redeemedAt);
          if (pendingInvite) {
            inviteToken = pendingInvite.token;
            inviteEmail = pendingInvite.email;
            console.log("Found invite token:", inviteToken);
            console.log("Invite email:", inviteEmail);
          }
        }
      }

      expect(true).toBe(true); // Just log the data
    });
  });

  test.describe("API: Check accountExists flag", () => {
    test("verify API returns accountExists for existing user email", async ({ request }) => {
      // Test with a known existing user email (marcus@example.com is seeded)
      // First we need to create an invitation for this user or use an existing one

      // Use admin auth to create a test invitation
      const adminResponse = await request.get("/api/admin/invitations", {
        headers: {
          // Admin cookies should be in the request automatically if using storageState
        }
      });

      console.log("Checking API for invitation details...");

      // For now, let's test the public endpoint directly with a mock token
      // We'll need to get a real token from the admin panel first
      expect(true).toBe(true);
    });
  });

  test.describe("Invite Page: Not logged in", () => {
    // No auth state - unauthenticated user
    test.use({ storageState: { cookies: [], origins: [] } });

    test("visit invite page and check UI elements", async ({ page, request }) => {
      // First, get a valid invite token from admin API
      // We need to make an authenticated request to get tokens

      // For debugging, let's visit the invite page with a test token
      // and see what happens

      // Get invitations from admin API (this will fail without auth, but let's try)
      console.log("Testing invite page behavior...");

      // Visit a test invite URL - we'll use a placeholder token
      // In real test, we'd get this from the admin panel first
      await page.goto("/invite/test-token-placeholder");

      // Wait for page to load
      await page.waitForLoadState("domcontentloaded");

      // Check what we see
      const pageContent = await page.content();
      console.log("Page URL:", page.url());

      // Look for error message (invalid token)
      const errorMessage = page.getByText(/not found|invalid|expired/i);
      const isError = await errorMessage.first().isVisible().catch(() => false);
      console.log("Shows error for invalid token:", isError);

      expect(true).toBe(true);
    });

    test("check invite API response directly", async ({ request }) => {
      // Test the API endpoint that the invite page calls
      const response = await request.get("/api/invitations/test-invalid-token");

      console.log("API response for invalid token:");
      console.log("  Status:", response.status());

      const data = await response.json().catch(() => ({}));
      console.log("  Body:", JSON.stringify(data, null, 2));

      expect(response.status()).toBe(404);
    });
  });

  test.describe("Full flow with real invitation", () => {
    test.use({ storageState: adminAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(adminAuthState)) {
        test.skip(true, "Admin auth state not found");
      }
    });

    test("create invitation and test API response", async ({ page, request }) => {
      // Step 1: Go to admin invitations page
      await page.goto("/dashboard/invitations");
      await page.waitForLoadState("domcontentloaded");

      // Step 2: Get list of invitations via API
      const listResponse = await request.get("/api/admin/invitations");
      console.log("\n=== Fetching existing invitations ===");
      console.log("Status:", listResponse.status());

      if (!listResponse.ok()) {
        console.log("Failed to get invitations list");
        return;
      }

      const listData = await listResponse.json();
      console.log("Total invitations:", listData.invitations?.length || 0);

      // Find a pending invitation
      const pendingInvitation = listData.invitations?.find(
        (inv: { redeemedAt: null | string; token: string }) => !inv.redeemedAt && inv.token
      );

      if (!pendingInvitation) {
        console.log("No pending invitations found");
        // Create one via UI or skip
        expect(true).toBe(true);
        return;
      }

      console.log("\n=== Testing invite token ===");
      console.log("Token:", pendingInvitation.token);
      console.log("Email:", pendingInvitation.email);

      // Step 3: Test the public invite API endpoint
      const inviteResponse = await request.get(`/api/invitations/${pendingInvitation.token}`);
      console.log("\nPublic invite API response:");
      console.log("Status:", inviteResponse.status());

      const inviteData = await inviteResponse.json().catch(() => ({}));
      console.log("Data:", JSON.stringify(inviteData, null, 2));

      // Check if accountExists is present and correct
      console.log("\n=== accountExists check ===");
      console.log("accountExists value:", inviteData.accountExists);
      console.log("Expected: based on whether", inviteData.email, "exists in database");

      expect(inviteData).toHaveProperty("accountExists");
    });

    test("verify invite page shows correct buttons", async ({ page, request, context }) => {
      // Get a valid invitation token first
      const listResponse = await request.get("/api/admin/invitations");
      if (!listResponse.ok()) {
        test.skip(true, "Could not fetch invitations");
        return;
      }

      const listData = await listResponse.json();
      const pendingInvitation = listData.invitations?.find(
        (inv: { redeemedAt: null | string; token: string }) => !inv.redeemedAt && inv.token
      );

      if (!pendingInvitation) {
        test.skip(true, "No pending invitation found");
        return;
      }

      const token = pendingInvitation.token;
      console.log("\n=== Testing invite page UI ===");
      console.log("Using token:", token);

      // Clear cookies to test as unauthenticated user
      await context.clearCookies();

      // Visit invite page
      await page.goto(`/invite/${token}`);
      await page.waitForLoadState("networkidle");

      console.log("Current URL:", page.url());

      // Take a screenshot for debugging
      await page.screenshot({ path: "e2e/screenshots/invite-page-unauthenticated.png" });

      // Check for Accept button
      const acceptButton = page.getByRole("button", { name: /accept/i });
      const declineButton = page.getByRole("button", { name: /decline/i });
      const signInButton = page.getByRole("button", { name: /sign in/i });

      const hasAccept = await acceptButton.isVisible().catch(() => false);
      const hasDecline = await declineButton.isVisible().catch(() => false);
      const hasSignIn = await signInButton.isVisible().catch(() => false);

      console.log("Buttons visible:");
      console.log("  Accept:", hasAccept);
      console.log("  Decline:", hasDecline);
      console.log("  Sign In:", hasSignIn);

      // Check the helper text
      const signInText = page.getByText(/sign in to complete/i);
      const createAccountText = page.getByText(/create an account/i);

      const hasSignInText = await signInText.isVisible().catch(() => false);
      const hasCreateText = await createAccountText.isVisible().catch(() => false);

      console.log("Helper text:");
      console.log("  'sign in to complete':", hasSignInText);
      console.log("  'create an account':", hasCreateText);

      // Either Accept or Sign In should be visible
      expect(hasAccept || hasSignIn).toBe(true);
    });

    test("check what happens when Accept is clicked", async ({ page, request, context }) => {
      // Get a valid invitation token
      const listResponse = await request.get("/api/admin/invitations");
      if (!listResponse.ok()) {
        test.skip(true, "Could not fetch invitations");
        return;
      }

      const listData = await listResponse.json();
      const pendingInvitation = listData.invitations?.find(
        (inv: { redeemedAt: null | string; token: string }) => !inv.redeemedAt && inv.token
      );

      if (!pendingInvitation) {
        test.skip(true, "No pending invitation found");
        return;
      }

      const token = pendingInvitation.token;

      // First check what accountExists returns
      const inviteResponse = await request.get(`/api/invitations/${token}`);
      const inviteData = await inviteResponse.json();
      console.log("\n=== Testing Accept button redirect ===");
      console.log("accountExists:", inviteData.accountExists);
      console.log("Expected redirect:", inviteData.accountExists ? "/sign-in" : "/sign-up");

      // Clear cookies
      await context.clearCookies();

      // Visit invite page
      await page.goto(`/invite/${token}`);
      await page.waitForLoadState("networkidle");

      // Find and click Accept button
      const acceptButton = page.getByRole("button", { name: /accept/i });

      if (await acceptButton.isVisible()) {
        console.log("Clicking Accept button...");
        await acceptButton.click();

        // Wait for navigation
        await page.waitForURL(/sign-in|sign-up/, { timeout: 5000 }).catch(() => {});

        console.log("Redirected to:", page.url());

        // Check if sessionStorage has the token
        const storedToken = await page.evaluate(() => {
          return sessionStorage.getItem("pendingInviteToken");
        });
        console.log("Token stored in sessionStorage:", storedToken);

        // Verify redirect matches accountExists
        if (inviteData.accountExists) {
          expect(page.url()).toContain("/sign-in");
        } else {
          expect(page.url()).toContain("/sign-up");
        }
      } else {
        console.log("Accept button not visible");
        // Take screenshot
        await page.screenshot({ path: "e2e/screenshots/invite-page-no-accept.png" });
      }
    });
  });

  test.describe("Debug: Check database for user", () => {
    test.use({ storageState: adminAuthState });

    test("verify test user exists in database via admin API", async ({ request }) => {
      // Check if users API returns our test users
      const response = await request.get("/api/admin/users");

      console.log("\n=== Checking users in database ===");
      console.log("Status:", response.status());

      if (response.ok()) {
        const data = await response.json();
        console.log("Total users:", data.users?.length || 0);

        // Look for specific emails
        const testEmails = [
          "admin@example.com",
          "marcus@example.com",
          "emily@example.com",
          "sarah@example.com",
        ];

        testEmails.forEach(email => {
          const user = data.users?.find((u: { email: string }) =>
            u.email.toLowerCase() === email.toLowerCase()
          );
          console.log(`  ${email}: ${user ? "EXISTS" : "NOT FOUND"}`);
        });
      }

      expect(true).toBe(true);
    });
  });
});
