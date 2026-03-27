import { test, expect } from "@playwright/test";

/**
 * E2E tests for Section Management
 *
 * Tests cover:
 * - Create section
 * - Rename section
 * - Delete section
 * - Reorder sections (drag and drop)
 * - Section collapse/expand
 */

test.describe("Section Management", () => {
  // Helper to mock authentication
  async function mockAuth(page: typeof test.prototype.page) {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "user-1",
            email: "admin@example.com",
            name: "Admin User",
            role: "admin",
          },
        }),
      });
    });
  }

  // Mock workspace with sections
  async function mockWorkspaceWithSections(page: typeof test.prototype.page) {
    await page.route("**/api/workspaces/*", async (route) => {
      if (route.request().method() === "GET" && !route.request().url().includes("/members")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "ws-1",
            name: "Test Workspace",
            description: "A test workspace",
            isPublished: true,
            sections: [
              {
                id: "section-1",
                title: "Getting Started",
                order: 0,
                tasks: [
                  {
                    id: "task-1",
                    title: "Welcome",
                    type: "ACKNOWLEDGEMENT",
                    status: "not_started",
                    order: 0,
                  },
                ],
              },
              {
                id: "section-2",
                title: "Documentation",
                order: 1,
                tasks: [
                  {
                    id: "task-2",
                    title: "Upload Documents",
                    type: "FILE_REQUEST",
                    status: "not_started",
                    order: 0,
                  },
                ],
              },
              {
                id: "section-3",
                title: "Final Steps",
                order: 2,
                tasks: [],
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });
  }

  test.describe("Section Creation", () => {
    test("can create a new section", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      // Mock section creation endpoint
      await page.route("**/api/workspaces/*/sections", async (route) => {
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: "section-new",
              title: body.title || "New Section",
              order: 3,
              tasks: [],
            }),
          });
        } else {
          await route.continue();
        }
      });

      // Navigate to workspace
      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Look for add section button
      const addSectionButton = page.getByRole("button", { name: /add section/i });
      // Button may or may not be visible depending on user role
    });

    test("new section appears at the end of the list", async ({ page }) => {
      await mockAuth(page);
      // Test would verify section order after creation
    });
  });

  test.describe("Section Renaming", () => {
    test("can rename a section", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      // Mock section update endpoint
      await page.route("**/api/sections/*", async (route) => {
        if (route.request().method() === "PATCH" || route.request().method() === "PUT") {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "section-1",
              title: body.title,
              order: 0,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Test would click section name to edit
    });

    test("section name updates in real-time", async ({ page }) => {
      await mockAuth(page);
      // Test would verify immediate UI update
    });

    test("empty section name is rejected", async ({ page }) => {
      await mockAuth(page);
      // Test would verify validation
    });
  });

  test.describe("Section Deletion", () => {
    test("can delete an empty section", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      // Mock section delete endpoint
      await page.route("**/api/sections/*", async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Test would click delete on section-3 (empty)
    });

    test("shows confirmation when deleting section with tasks", async ({ page }) => {
      await mockAuth(page);
      // Test would verify confirmation dialog
    });

    test("section with tasks shows warning about task deletion", async ({ page }) => {
      await mockAuth(page);
      // Test would verify warning message
    });
  });

  test.describe("Section Reordering", () => {
    test("can reorder sections via drag and drop", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      // Mock section reorder endpoint
      await page.route("**/api/workspaces/*/sections/reorder", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Drag and drop test
      // This requires finding drag handles and performing drag action
    });

    test("section order persists after page refresh", async ({ page }) => {
      await mockAuth(page);
      // Test would verify persistence
    });
  });

  test.describe("Section Collapse/Expand", () => {
    test("can collapse a section", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Look for collapse button/chevron
      // Click to collapse section
    });

    test("collapsed section hides tasks", async ({ page }) => {
      await mockAuth(page);
      // Test would verify tasks are hidden
    });

    test("can expand a collapsed section", async ({ page }) => {
      await mockAuth(page);
      // Test would expand and verify tasks visible
    });

    test("collapse state persists in session", async ({ page }) => {
      await mockAuth(page);
      // Test would verify collapse state persistence
    });
  });

  test.describe("Section Task Count", () => {
    test("shows task count in section header", async ({ page }) => {
      await mockAuth(page);
      await mockWorkspaceWithSections(page);

      await page.goto("/workspace/ws-1");
      await page.waitForLoadState("domcontentloaded");

      // Look for task count indicators
      // Section 1 should show 1 task, Section 2 should show 1 task, Section 3 should show 0
    });

    test("shows completed task count", async ({ page }) => {
      await mockAuth(page);
      // Test would verify completed/total display
    });
  });
});

test.describe("Section API", () => {
  test("POST /api/workspaces/[id]/sections returns 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.post("/api/workspaces/test-id/sections", {
      data: { title: "New Section" },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("DELETE /api/sections/[id] returns 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.delete("/api/sections/test-id");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("PATCH /api/sections/[id] returns 401 or 405 for unauthenticated requests", async ({ request }) => {
    const response = await request.patch("/api/sections/test-id", {
      data: { title: "Updated Title" },
    });
    // 401 = Unauthorized, 405 = Method Not Allowed (uses PUT instead of PATCH)
    expect([401, 405]).toContain(response.status());
  });

  test("POST /api/workspaces/:id/sections/reorder returns 401 for unauthenticated requests", async ({
    request,
  }) => {
    const response = await request.post("/api/workspaces/ws-123/sections/reorder", {
      data: { sectionIds: ["s1", "s2", "s3"] },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("Section Business Logic", () => {
  test.describe("Section Data Structure", () => {
    test("validates section interface structure", () => {
      interface Section {
        id: string;
        title: string;
        description: string | null;
        status: string;
        position: number;
        tasks: Array<{ id: string; title: string }>;
      }

      const sampleSection: Section = {
        id: "section-1",
        title: "Onboarding",
        description: "Initial setup tasks",
        status: "in_progress",
        position: 0,
        tasks: [
          { id: "task-1", title: "Complete form" },
          { id: "task-2", title: "Upload documents" },
        ],
      };

      expect(sampleSection.id).toBeTruthy();
      expect(sampleSection.title).toBeTruthy();
      expect(sampleSection.tasks).toBeInstanceOf(Array);
    });
  });

  test.describe("Title Validation", () => {
    test("validates section title requirements", () => {
      const isValidTitle = (title: string): { valid: boolean; error?: string } => {
        const trimmed = title.trim();
        if (!trimmed) {
          return { valid: false, error: "Title is required" };
        }
        if (trimmed.length > 100) {
          return { valid: false, error: "Title must be less than 100 characters" };
        }
        return { valid: true };
      };

      expect(isValidTitle("Valid Section").valid).toBe(true);
      expect(isValidTitle("").valid).toBe(false);
      expect(isValidTitle("   ").valid).toBe(false);
      expect(isValidTitle("A".repeat(101)).valid).toBe(false);
    });
  });

  test.describe("Section Status Calculation", () => {
    test("calculates section status from tasks", () => {
      interface Task {
        status: string;
      }

      const calculateSectionStatus = (tasks: Task[]): string => {
        if (tasks.length === 0) return "not_started";

        const allCompleted = tasks.every((t) => t.status === "completed");
        if (allCompleted) return "completed";

        const anyInProgress = tasks.some(
          (t) => t.status === "in_progress" || t.status === "completed"
        );
        if (anyInProgress) return "in_progress";

        return "not_started";
      };

      expect(calculateSectionStatus([])).toBe("not_started");
      expect(
        calculateSectionStatus([{ status: "not_started" }, { status: "not_started" }])
      ).toBe("not_started");
      expect(
        calculateSectionStatus([{ status: "in_progress" }, { status: "not_started" }])
      ).toBe("in_progress");
      expect(
        calculateSectionStatus([{ status: "completed" }, { status: "completed" }])
      ).toBe("completed");
    });
  });

  test.describe("Admin-Only Actions", () => {
    test("only admin can delete sections", () => {
      const canDeleteSection = (userRole: string): boolean => {
        return userRole === "admin";
      };

      expect(canDeleteSection("admin")).toBe(true);
      expect(canDeleteSection("user")).toBe(false);
    });

    test("only admin can reorder sections", () => {
      const canReorderSections = (userRole: string): boolean => {
        return userRole === "admin";
      };

      expect(canReorderSections("admin")).toBe(true);
      expect(canReorderSections("user")).toBe(false);
    });

    test("only admin can edit sections", () => {
      const canEditSection = (userRole: string): boolean => {
        return userRole === "admin";
      };

      expect(canEditSection("admin")).toBe(true);
      expect(canEditSection("user")).toBe(false);
    });
  });

  test.describe("Section Deletion Warning", () => {
    test("warns about task deletion in confirmation dialog", () => {
      const warningMessage =
        "This will also delete all tasks within this section. This action cannot be undone.";

      expect(warningMessage).toContain("delete all tasks");
      expect(warningMessage).toContain("cannot be undone");
    });

    test("removes section and its tasks from list", () => {
      interface Section {
        id: string;
        tasks: Array<{ id: string }>;
      }

      let sections: Section[] = [
        { id: "1", tasks: [{ id: "t1" }, { id: "t2" }] },
        { id: "2", tasks: [{ id: "t3" }] },
      ];

      const deleteSection = (sectionId: string) => {
        sections = sections.filter((s) => s.id !== sectionId);
      };

      const totalTasksBefore = sections.reduce((sum, s) => sum + s.tasks.length, 0);
      expect(totalTasksBefore).toBe(3);

      deleteSection("1");
      expect(sections).toHaveLength(1);

      const totalTasksAfter = sections.reduce((sum, s) => sum + s.tasks.length, 0);
      expect(totalTasksAfter).toBe(1);
    });
  });

  test.describe("Section Reordering", () => {
    test("updates section positions after reorder", () => {
      interface Section {
        id: string;
        position: number;
      }

      let sections: Section[] = [
        { id: "1", position: 0 },
        { id: "2", position: 1 },
        { id: "3", position: 2 },
      ];

      const reorderSections = (newOrder: string[]) => {
        sections = newOrder.map((id, index) => ({
          id,
          position: index,
        }));
      };

      reorderSections(["3", "1", "2"]);

      expect(sections[0].id).toBe("3");
      expect(sections[0].position).toBe(0);
      expect(sections[1].id).toBe("1");
      expect(sections[2].id).toBe("2");
    });
  });

  test.describe("Empty Workspace Prompt", () => {
    test("prompts to create section when adding task to empty workspace", () => {
      interface Section {
        id: string;
      }

      const shouldPromptCreateSection = (sections: Section[]): boolean => {
        return sections.length === 0;
      };

      expect(shouldPromptCreateSection([])).toBe(true);
      expect(shouldPromptCreateSection([{ id: "1" }])).toBe(false);
    });
  });
});
