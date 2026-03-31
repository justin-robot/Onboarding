import { chromium, FullConfig } from "@playwright/test";
import * as fs from "fs";
import {
  testUsers,
  authStateDir,
  adminAuthState,
  userAuthState,
  emilyAuthState,
  sarahAuthState,
  loginAndSaveState,
  hasValidAuthState,
} from "./fixtures/auth";

/**
 * Global setup for Playwright E2E tests
 *
 * This script runs once before all tests to:
 * 1. Ensure auth state directory exists
 * 2. Login as test users and save their storage states
 *
 * The saved states can then be reused by tests, avoiding repeated logins.
 *
 * Prerequisites:
 * - Database must be seeded with test users (run: pnpm db:seed)
 * - App must be running (started by playwright webServer config)
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  console.log("\n=== E2E Global Setup ===\n");
  console.log(`Base URL: ${baseURL}`);

  // Ensure auth state directory exists
  if (!fs.existsSync(authStateDir)) {
    fs.mkdirSync(authStateDir, { recursive: true });
    console.log(`Created auth state directory: ${authStateDir}`);
  }

  // Check if we already have valid auth states
  const hasAdminAuth = hasValidAuthState(adminAuthState);
  const hasUserAuth = hasValidAuthState(userAuthState);
  const hasEmilyAuth = hasValidAuthState(emilyAuthState);
  const hasSarahAuth = hasValidAuthState(sarahAuthState);

  if (hasAdminAuth && hasUserAuth && hasEmilyAuth && hasSarahAuth) {
    console.log("Valid auth states found, skipping login setup.");
    console.log("  - Admin auth state: OK");
    console.log("  - User auth state: OK");
    console.log("  - Emily auth state: OK");
    console.log("  - Sarah auth state: OK");
    console.log("\nTo refresh auth states, delete the .auth directory.\n");
    return;
  }

  console.log("Setting up authenticated sessions...\n");

  // Launch browser for setup
  const browser = await chromium.launch();

  try {
    // Setup admin auth state
    if (!hasAdminAuth) {
      console.log("Logging in as admin...");
      const adminContext = await browser.newContext({ baseURL });
      const adminPage = await adminContext.newPage();
      adminPage.setDefaultTimeout(30000);

      const adminSuccess = await loginAndSaveState(
        adminPage,
        testUsers.admin.email,
        testUsers.admin.password,
        adminAuthState
      );

      if (adminSuccess) {
        console.log("  Admin login successful!");
      } else {
        console.error("  Admin login FAILED!");
        console.error("  Make sure the database is seeded: pnpm db:seed");
      }

      await adminContext.close();
    } else {
      console.log("Admin auth state already exists.");
    }

    // Setup user auth state (using marcus@example.com as default user)
    if (!hasUserAuth) {
      console.log("Logging in as regular user (Marcus)...");
      const userContext = await browser.newContext({ baseURL });
      const userPage = await userContext.newPage();
      userPage.setDefaultTimeout(30000);

      const userSuccess = await loginAndSaveState(
        userPage,
        testUsers.user1.email,
        testUsers.user1.password,
        userAuthState
      );

      if (userSuccess) {
        console.log("  User login successful!");
      } else {
        console.error("  User login FAILED!");
        console.error("  Make sure the database is seeded: pnpm db:seed");
      }

      await userContext.close();
    } else {
      console.log("User auth state already exists.");
    }

    // Setup Emily auth state
    if (!hasEmilyAuth) {
      console.log("Logging in as Emily...");
      const emilyContext = await browser.newContext({ baseURL });
      const emilyPage = await emilyContext.newPage();
      emilyPage.setDefaultTimeout(30000);

      const emilySuccess = await loginAndSaveState(
        emilyPage,
        testUsers.user2.email,
        testUsers.user2.password,
        emilyAuthState
      );

      if (emilySuccess) {
        console.log("  Emily login successful!");
      } else {
        console.error("  Emily login FAILED!");
      }

      await emilyContext.close();
    } else {
      console.log("Emily auth state already exists.");
    }

    // Setup Sarah auth state
    if (!hasSarahAuth) {
      console.log("Logging in as Sarah...");
      const sarahContext = await browser.newContext({ baseURL });
      const sarahPage = await sarahContext.newPage();
      sarahPage.setDefaultTimeout(30000);

      const sarahSuccess = await loginAndSaveState(
        sarahPage,
        testUsers.accountManager.email,
        testUsers.accountManager.password,
        sarahAuthState
      );

      if (sarahSuccess) {
        console.log("  Sarah login successful!");
      } else {
        console.error("  Sarah login FAILED!");
      }

      await sarahContext.close();
    } else {
      console.log("Sarah auth state already exists.");
    }
  } finally {
    await browser.close();
  }

  console.log("\n=== Setup Complete ===\n");
}

export default globalSetup;
