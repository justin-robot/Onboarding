import { test, expect } from "@playwright/test";
import { userAuthState, hasValidAuthState, testUsers } from "./fixtures/auth";

/**
 * Simple API tests for invite flow debugging
 */
test.describe("Invite API Debug", () => {
  test.describe("With User Auth", () => {
    test.use({ storageState: userAuthState });

    test.beforeEach(async () => {
      if (!hasValidAuthState(userAuthState)) {
        test.skip(true, "User auth state not found");
      }
    });

    test("get pending invitations and test accountExists", async ({ request }) => {
      // Step 1: Get list of invitations
      console.log("\n=== Step 1: Fetching invitations list ===");
      const listResponse = await request.get("/api/admin/invitations");
      console.log("List API status:", listResponse.status());

      if (!listResponse.ok()) {
        console.log("Failed to get invitations - check if admin auth is valid");
        return;
      }

      const listData = await listResponse.json();
      const invitations = listData.invitations || [];
      console.log("Total invitations:", invitations.length);

      // Find pending invitations with tokens
      const pendingInvitations = invitations.filter(
        (inv: { redeemedAt: null | string; token: string }) => !inv.redeemedAt && inv.token
      );
      console.log("Pending invitations:", pendingInvitations.length);

      if (pendingInvitations.length === 0) {
        console.log("No pending invitations found - cannot test");
        return;
      }

      // Step 2: For each pending invitation, test the public API
      console.log("\n=== Step 2: Testing public API for each invitation ===");

      for (const inv of pendingInvitations.slice(0, 3)) {
        console.log(`\n--- Testing invitation for: ${inv.email} ---`);
        console.log("Token:", inv.token?.substring(0, 20) + "...");

        const publicResponse = await request.get(`/api/invitations/${inv.token}`);
        console.log("Public API status:", publicResponse.status());

        if (publicResponse.ok()) {
          const data = await publicResponse.json();
          console.log("Response data:");
          console.log("  email:", data.email);
          console.log("  workspaceName:", data.workspaceName);
          console.log("  role:", data.role);
          console.log("  accountExists:", data.accountExists);
          console.log("  accountExists type:", typeof data.accountExists);

          // Verify accountExists is a boolean
          expect(typeof data.accountExists).toBe("boolean");

          // Check if this email is a known test user
          const knownEmails = Object.values(testUsers).map(u => u.email.toLowerCase());
          const isKnownUser = knownEmails.includes(data.email.toLowerCase());
          console.log("  Is known test user:", isKnownUser);

          if (isKnownUser) {
            // If it's a known test user, accountExists should be true
            console.log("  Expected accountExists: true (known user)");
            if (!data.accountExists) {
              console.log("  WARNING: accountExists is false for a known user!");
            }
          }
        } else {
          const errorData = await publicResponse.json().catch(() => ({}));
          console.log("Error response:", errorData);
        }
      }
    });

    test("check users table for test users", async ({ request }) => {
      console.log("\n=== Checking users in database ===");

      const usersResponse = await request.get("/api/admin/users");
      console.log("Users API status:", usersResponse.status());

      if (!usersResponse.ok()) {
        console.log("Failed to get users");
        return;
      }

      const usersData = await usersResponse.json();
      const users = usersData.users || [];
      console.log("Total users:", users.length);

      // List first 10 users
      console.log("\nUsers in database:");
      for (const user of users.slice(0, 10)) {
        console.log(`  - ${user.email} (id: ${user.id?.substring(0, 8)}...)`);
      }

      // Check for test users specifically
      console.log("\n=== Checking test user emails ===");
      const testEmails = [
        "admin@example.com",
        "marcus@example.com",
        "emily@example.com",
        "sarah@example.com",
      ];

      for (const email of testEmails) {
        const user = users.find((u: { email: string }) =>
          u.email.toLowerCase() === email.toLowerCase()
        );
        console.log(`  ${email}: ${user ? "FOUND" : "NOT FOUND"}`);
      }
    });

    test("create test invitation for existing user", async ({ request }) => {
      // First get workspaces
      console.log("\n=== Getting workspaces ===");
      const workspacesResponse = await request.get("/api/admin/workspaces");

      if (!workspacesResponse.ok()) {
        console.log("Failed to get workspaces");
        return;
      }

      const workspacesData = await workspacesResponse.json();
      const workspaces = workspacesData.workspaces || [];

      if (workspaces.length === 0) {
        console.log("No workspaces found");
        return;
      }

      const workspace = workspaces[0];
      console.log("Using workspace:", workspace.name, "(", workspace.id, ")");

      // Check if there's already an invitation for marcus@example.com
      console.log("\n=== Checking for existing invitation ===");
      const invitationsResponse = await request.get("/api/admin/invitations");
      const invitationsData = await invitationsResponse.json();
      const existingInvite = invitationsData.invitations?.find(
        (inv: { email: string; redeemedAt: null | string }) =>
          inv.email.toLowerCase() === "marcus@example.com" && !inv.redeemedAt
      );

      if (existingInvite) {
        console.log("Found existing invitation for marcus@example.com");
        console.log("Testing accountExists for this invitation...");

        const publicResponse = await request.get(`/api/invitations/${existingInvite.token}`);
        if (publicResponse.ok()) {
          const data = await publicResponse.json();
          console.log("accountExists:", data.accountExists);
          console.log("Expected: true (marcus is a test user)");
        }
      } else {
        console.log("No existing invitation for marcus@example.com");
      }
    });
  });

  test.describe("Direct API test without auth", () => {
    test("test invite API with no cookies", async ({ request }) => {
      console.log("\n=== Testing invite API without auth ===");

      // This should work without auth - it's a public endpoint
      const response = await request.get("/api/invitations/test-invalid-token");

      console.log("Status:", response.status());
      console.log("Expected: 404 (invalid token)");

      const data = await response.json();
      console.log("Response:", data);

      expect(response.status()).toBe(404);
    });
  });
});
