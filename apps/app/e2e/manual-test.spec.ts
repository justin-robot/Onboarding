import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Manual click-through test to find issues
 */

interface Issue {
  area: string;
  severity: "critical" | "major" | "minor";
  description: string;
}

const issues: Issue[] = [];

function logIssue(area: string, severity: Issue["severity"], description: string) {
  issues.push({ area, severity, description });
  console.log(`[${severity.toUpperCase()}] ${area}: ${description}`);
}

test.describe("App Manual Testing", () => {
  test.use({
    storageState: path.join(__dirname, "auth.json"),
  });

  test.setTimeout(120000);

  test("find issues in the app", async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Track all 404 responses with URLs
    page.on("response", (response) => {
      if (response.status() === 404) {
        networkErrors.push({ url: response.url(), status: 404 });
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("FINDING ISSUES IN THE APP");
    console.log("=".repeat(60) + "\n");

    // Go directly to workspace
    console.log(">>> Navigating to workspace...\n");
    await page.goto("/workspace/e38763e6-e1a0-4399-9f41-fe5ea030d7c0");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // ============================================================
    // TEST 1: Basic Page Elements
    // ============================================================
    console.log(">>> TEST 1: Basic Page Elements <<<\n");

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const flowTab = page.locator('button:has-text("Flow"), [role="tab"]:has-text("Flow")');
    const flowVisible = await flowTab.isVisible().catch(() => false);
    console.log(`Flow tab visible: ${flowVisible}`);

    // ============================================================
    // TEST 2: Add Task Dialog
    // ============================================================
    console.log("\n>>> TEST 2: Add Task Dialog <<<\n");

    const addTaskBtn = page.locator('button:has-text("Add task")').first();
    if (await addTaskBtn.isVisible().catch(() => false)) {
      await addTaskBtn.click();
      await page.waitForTimeout(1000);

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible().catch(() => false)) {
        console.log("✓ Dialog opened successfully");

        // Go through all 3 steps
        await dialog.locator('text=Form').click();
        await page.waitForTimeout(500);
        console.log("✓ Step 2 reached");

        await dialog.locator('button:has-text("Add here")').first().click();
        await page.waitForTimeout(500);
        console.log("✓ Step 3 reached");

        // Close with Cancel
        const cancelBtn = dialog.locator('button:has-text("Cancel")');
        await cancelBtn.click();
        await page.waitForTimeout(500);

        if (!await dialog.isVisible().catch(() => false)) {
          console.log("✓ Cancel closes dialog properly");
        } else {
          logIssue("Add Task", "major", "Cancel button doesn't close dialog");
        }
      }
    }

    // ============================================================
    // TEST 3: Task Click
    // ============================================================
    console.log("\n>>> TEST 3: Task Interaction <<<\n");

    const taskButtons = page.locator('button').filter({ hasText: /Complete|Acknowledge|Schedule|Sign|Upload/i });
    if (await taskButtons.count() > 0) {
      await taskButtons.first().click();
      await page.waitForTimeout(1000);
      console.log("✓ Clicked on a task");
    }

    // ============================================================
    // TEST 4: Network Errors
    // ============================================================
    console.log("\n>>> TEST 4: Network Analysis <<<\n");

    if (networkErrors.length > 0) {
      console.log("404 Errors Found:");
      networkErrors.forEach(err => {
        // Filter out dev/build artifacts
        if (!err.url.includes("_next") && !err.url.includes("favicon")) {
          console.log(`  - ${err.url}`);
          logIssue("Network", "major", `404: ${err.url}`);
        } else {
          console.log(`  - (dev artifact) ${err.url}`);
        }
      });
    } else {
      console.log("No 404 errors");
    }

    // ============================================================
    // TEST 5: Console Errors
    // ============================================================
    console.log("\n>>> TEST 5: Console Errors <<<\n");

    const significantErrors = consoleErrors.filter(e =>
      !e.includes("503") &&
      !e.includes("favicon") &&
      !e.includes("DialogTitle") &&
      !e.includes("chunk")
    );

    if (significantErrors.length > 0) {
      console.log("Console Errors:");
      significantErrors.forEach(err => {
        console.log(`  - ${err.substring(0, 150)}`);
      });
    } else {
      console.log("No significant console errors");
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("ISSUES SUMMARY");
    console.log("=".repeat(60) + "\n");

    const critical = issues.filter(i => i.severity === "critical");
    const major = issues.filter(i => i.severity === "major");
    const minor = issues.filter(i => i.severity === "minor");

    if (critical.length > 0) {
      console.log("🔴 CRITICAL ISSUES:");
      critical.forEach(i => console.log(`   - [${i.area}] ${i.description}`));
    }

    if (major.length > 0) {
      console.log("🟠 MAJOR ISSUES:");
      major.forEach(i => console.log(`   - [${i.area}] ${i.description}`));
    }

    if (minor.length > 0) {
      console.log("🟡 MINOR ISSUES:");
      minor.forEach(i => console.log(`   - [${i.area}] ${i.description}`));
    }

    if (issues.length === 0) {
      console.log("✅ No issues found!");
    }

    console.log("\n" + "=".repeat(60));
    console.log(`TOTALS: ${critical.length} critical, ${major.length} major, ${minor.length} minor`);
    console.log("=".repeat(60) + "\n");
  });
});
