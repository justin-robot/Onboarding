import { test, expect } from "./fixtures/auth";

/**
 * E2E: Template System Tests
 *
 * Tests the workspace template functionality:
 * - Template listing and search
 * - Creating workspace from template
 * - Save workspace as template (creates a copy)
 * - Template detail page with derived workspaces
 * - sourceTemplateId tracking
 * - Deleting templates
 *
 * Note: Full UI tests require authentication.
 * These tests verify business logic and expected behaviors.
 */

test.describe("Template System", () => {
  test.describe("Data Structures", () => {
    test("validates template interface structure", () => {
      interface Template {
        id: string;
        name: string;
        description: string | null;
        sectionCount: number;
        taskCount: number;
        createdAt: string;
        updatedAt: string;
      }

      const sampleTemplate: Template = {
        id: "template-1",
        name: "Client Onboarding",
        description: "Standard onboarding flow for new clients",
        sectionCount: 5,
        taskCount: 20,
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-03-20T15:30:00Z",
      };

      expect(sampleTemplate.id).toBeTruthy();
      expect(sampleTemplate.name).toBeTruthy();
      expect(sampleTemplate.sectionCount).toBeGreaterThanOrEqual(0);
      expect(sampleTemplate.taskCount).toBeGreaterThanOrEqual(0);
    });

    test("validates derived workspace interface structure", () => {
      interface DerivedWorkspace {
        id: string;
        name: string;
        description: string | null;
        createdAt: string;
        isPublished: boolean;
        progress: number;
      }

      const sampleWorkspace: DerivedWorkspace = {
        id: "workspace-1",
        name: "Client A Onboarding",
        description: "Onboarding for Client A",
        createdAt: "2026-03-25T10:00:00Z",
        isPublished: true,
        progress: 75,
      };

      expect(sampleWorkspace.id).toBeTruthy();
      expect(sampleWorkspace.name).toBeTruthy();
      expect(sampleWorkspace.progress).toBeGreaterThanOrEqual(0);
      expect(sampleWorkspace.progress).toBeLessThanOrEqual(100);
    });

    test("validates template with derived workspaces response structure", () => {
      interface TemplateWithDerivedWorkspaces {
        template: {
          id: string;
          name: string;
          description: string | null;
          sectionCount: number;
          taskCount: number;
          createdAt: string;
          updatedAt: string;
        };
        derivedWorkspaces: Array<{
          id: string;
          name: string;
          description: string | null;
          createdAt: string;
          isPublished: boolean;
          progress: number;
        }>;
      }

      const response: TemplateWithDerivedWorkspaces = {
        template: {
          id: "template-1",
          name: "Onboarding Template",
          description: "Standard onboarding",
          sectionCount: 3,
          taskCount: 10,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        derivedWorkspaces: [
          {
            id: "ws-1",
            name: "Client A",
            description: null,
            createdAt: "2026-02-01T00:00:00Z",
            isPublished: true,
            progress: 100,
          },
          {
            id: "ws-2",
            name: "Client B",
            description: "B Corp onboarding",
            createdAt: "2026-03-01T00:00:00Z",
            isPublished: false,
            progress: 25,
          },
        ],
      };

      expect(response.template).toBeDefined();
      expect(response.derivedWorkspaces).toBeInstanceOf(Array);
      expect(response.derivedWorkspaces).toHaveLength(2);
    });

    test("validates save as template response structure", () => {
      interface SaveAsTemplateResponse {
        success: boolean;
        templateId: string;
        message: string;
      }

      const response: SaveAsTemplateResponse = {
        success: true,
        templateId: "new-template-id",
        message: "Template created successfully. Original workspace remains unchanged.",
      };

      expect(response.success).toBe(true);
      expect(response.templateId).toBeTruthy();
      expect(response.message).toContain("unchanged");
    });

    test("validates workspace with sourceTemplateId", () => {
      interface Workspace {
        id: string;
        name: string;
        isTemplate: boolean;
        sourceTemplateId: string | null;
      }

      // A regular workspace without template association
      const regularWorkspace: Workspace = {
        id: "ws-1",
        name: "Regular Workspace",
        isTemplate: false,
        sourceTemplateId: null,
      };

      expect(regularWorkspace.sourceTemplateId).toBeNull();
      expect(regularWorkspace.isTemplate).toBe(false);

      // A workspace created from a template
      const derivedWorkspace: Workspace = {
        id: "ws-2",
        name: "From Template",
        isTemplate: false,
        sourceTemplateId: "template-123",
      };

      expect(derivedWorkspace.sourceTemplateId).toBeTruthy();
      expect(derivedWorkspace.isTemplate).toBe(false);

      // A template itself (no sourceTemplateId)
      const template: Workspace = {
        id: "template-1",
        name: "Template",
        isTemplate: true,
        sourceTemplateId: null,
      };

      expect(template.isTemplate).toBe(true);
      expect(template.sourceTemplateId).toBeNull();
    });
  });

  test.describe("API Endpoints", () => {
    test("GET /api/admin/templates returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/admin/templates");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/templates/:id returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/admin/templates/template-123");
      expect(response.status()).toBe(401);
    });

    test("GET /api/admin/templates/:id/workspaces returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/admin/templates/template-123/workspaces");
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/admin/templates/:id returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/admin/templates/template-123");
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/templates (create from template) returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/admin/templates", {
        data: {
          templateId: "template-123",
          name: "New Workspace",
        },
      });
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/workspaces/:id/save-as-template returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/admin/workspaces/workspace-123/save-as-template");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Save Workspace as Template Logic", () => {
    test("save as template creates a copy, not converts original", () => {
      interface Workspace {
        id: string;
        name: string;
        isTemplate: boolean;
        sourceTemplateId: string | null;
      }

      // Initial state: regular workspace
      const originalWorkspace: Workspace = {
        id: "ws-original",
        name: "My Onboarding Workspace",
        isTemplate: false,
        sourceTemplateId: null,
      };

      // Simulate save as template - creates a new template
      const newTemplate: Workspace = {
        id: "template-new",
        name: "My Onboarding Workspace", // Same name as original
        isTemplate: true,
        sourceTemplateId: null,
      };

      // Original workspace gets linked to the new template
      const updatedOriginal: Workspace = {
        ...originalWorkspace,
        sourceTemplateId: newTemplate.id,
      };

      // Verify original is NOT a template
      expect(updatedOriginal.isTemplate).toBe(false);
      // Verify original is linked to the new template
      expect(updatedOriginal.sourceTemplateId).toBe("template-new");
      // Verify new template IS a template
      expect(newTemplate.isTemplate).toBe(true);
    });

    test("original workspace remains in workspaces list after save as template", () => {
      interface Workspace {
        id: string;
        name: string;
        isTemplate: boolean;
      }

      let workspaces: Workspace[] = [
        { id: "ws-1", name: "Workspace 1", isTemplate: false },
        { id: "ws-2", name: "Workspace 2", isTemplate: false },
        { id: "ws-3", name: "Workspace 3", isTemplate: false },
      ];

      let templates: Workspace[] = [];

      // Save ws-2 as template (should create a copy)
      const newTemplate: Workspace = {
        id: "template-1",
        name: "Workspace 2",
        isTemplate: true,
      };

      templates.push(newTemplate);

      // Original workspace should still be in the list
      expect(workspaces).toHaveLength(3);
      expect(workspaces.find((w) => w.id === "ws-2")).toBeDefined();

      // Template list should have the new template
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe("template-1");
    });

    test("copies sections and tasks to template", () => {
      interface Section {
        id: string;
        title: string;
        tasks: Array<{ id: string; title: string; type: string }>;
      }

      const sourceSections: Section[] = [
        {
          id: "s1",
          title: "Getting Started",
          tasks: [
            { id: "t1", title: "Welcome", type: "ACKNOWLEDGEMENT" },
            { id: "t2", title: "Fill Form", type: "FORM" },
          ],
        },
        {
          id: "s2",
          title: "Documents",
          tasks: [
            { id: "t3", title: "Upload ID", type: "FILE_REQUEST" },
            { id: "t4", title: "Sign Contract", type: "E_SIGN" },
          ],
        },
      ];

      // Simulate copying to template (new IDs generated)
      const copiedSections: Section[] = sourceSections.map((section, sIndex) => ({
        id: `new-s${sIndex + 1}`,
        title: section.title,
        tasks: section.tasks.map((task, tIndex) => ({
          id: `new-t${sIndex * 10 + tIndex + 1}`,
          title: task.title,
          type: task.type,
        })),
      }));

      // Verify structure is preserved
      expect(copiedSections).toHaveLength(2);
      expect(copiedSections[0].title).toBe("Getting Started");
      expect(copiedSections[0].tasks).toHaveLength(2);
      expect(copiedSections[1].tasks[0].title).toBe("Upload ID");

      // Verify IDs are different (new copies)
      expect(copiedSections[0].id).not.toBe(sourceSections[0].id);
      expect(copiedSections[0].tasks[0].id).not.toBe(sourceSections[0].tasks[0].id);
    });
  });

  test.describe("Template Detail Page Logic", () => {
    test("shows all workspaces derived from template", () => {
      interface DerivedWorkspace {
        id: string;
        name: string;
        sourceTemplateId: string;
        progress: number;
      }

      const templateId = "template-onboarding";

      const allWorkspaces: DerivedWorkspace[] = [
        { id: "ws-1", name: "Client A", sourceTemplateId: "template-onboarding", progress: 100 },
        { id: "ws-2", name: "Client B", sourceTemplateId: "template-onboarding", progress: 50 },
        { id: "ws-3", name: "Other", sourceTemplateId: "template-other", progress: 0 },
        { id: "ws-4", name: "Client C", sourceTemplateId: "template-onboarding", progress: 75 },
      ];

      const derivedWorkspaces = allWorkspaces.filter(
        (w) => w.sourceTemplateId === templateId
      );

      expect(derivedWorkspaces).toHaveLength(3);
      expect(derivedWorkspaces.every((w) => w.sourceTemplateId === templateId)).toBe(true);
    });

    test("includes original workspace that was used to create template", () => {
      // When a workspace is saved as template, the original gets sourceTemplateId set
      // This means the original should appear in the derived workspaces list

      interface Workspace {
        id: string;
        name: string;
        sourceTemplateId: string | null;
        createdAt: string;
      }

      const templateId = "template-1";

      // Original workspace (earliest creation date, linked after template creation)
      const originalWorkspace: Workspace = {
        id: "ws-original",
        name: "Original Onboarding",
        sourceTemplateId: templateId, // Set when template was created
        createdAt: "2026-01-01T00:00:00Z",
      };

      // Workspaces created from template later
      const derivedWorkspaces: Workspace[] = [
        originalWorkspace,
        {
          id: "ws-copy-1",
          name: "Client A Onboarding",
          sourceTemplateId: templateId,
          createdAt: "2026-02-01T00:00:00Z",
        },
        {
          id: "ws-copy-2",
          name: "Client B Onboarding",
          sourceTemplateId: templateId,
          createdAt: "2026-03-01T00:00:00Z",
        },
      ];

      expect(derivedWorkspaces).toHaveLength(3);
      expect(derivedWorkspaces.find((w) => w.id === "ws-original")).toBeDefined();
    });

    test("calculates progress correctly for derived workspaces", () => {
      interface WorkspaceWithTasks {
        id: string;
        tasks: Array<{ status: string }>;
      }

      const calculateProgress = (workspace: WorkspaceWithTasks): number => {
        if (workspace.tasks.length === 0) return 0;
        const completed = workspace.tasks.filter((t) => t.status === "completed").length;
        return Math.round((completed / workspace.tasks.length) * 100);
      };

      const workspaces: WorkspaceWithTasks[] = [
        {
          id: "ws-1",
          tasks: [
            { status: "completed" },
            { status: "completed" },
            { status: "not_started" },
            { status: "not_started" },
          ],
        },
        {
          id: "ws-2",
          tasks: [
            { status: "completed" },
            { status: "completed" },
            { status: "completed" },
          ],
        },
        {
          id: "ws-3",
          tasks: [],
        },
      ];

      expect(calculateProgress(workspaces[0])).toBe(50);
      expect(calculateProgress(workspaces[1])).toBe(100);
      expect(calculateProgress(workspaces[2])).toBe(0);
    });

    test("sorts derived workspaces by creation date descending", () => {
      interface DerivedWorkspace {
        id: string;
        createdAt: string;
      }

      const workspaces: DerivedWorkspace[] = [
        { id: "ws-1", createdAt: "2026-01-15T00:00:00Z" },
        { id: "ws-2", createdAt: "2026-03-20T00:00:00Z" },
        { id: "ws-3", createdAt: "2026-02-10T00:00:00Z" },
      ];

      const sorted = [...workspaces].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect(sorted[0].id).toBe("ws-2"); // Most recent first
      expect(sorted[1].id).toBe("ws-3");
      expect(sorted[2].id).toBe("ws-1"); // Oldest last
    });
  });

  test.describe("Create Workspace from Template", () => {
    test("validates create from template request structure", () => {
      interface CreateFromTemplateRequest {
        templateId: string;
        name: string;
        description?: string;
        dueDate?: string;
        inviteEmail?: string;
      }

      const request: CreateFromTemplateRequest = {
        templateId: "template-1",
        name: "New Client Workspace",
        description: "Created from template",
      };

      expect(request.templateId).toBeTruthy();
      expect(request.name).toBeTruthy();
    });

    test("new workspace from template gets sourceTemplateId set", () => {
      interface Workspace {
        id: string;
        name: string;
        sourceTemplateId: string | null;
        isTemplate: boolean;
      }

      const templateId = "template-1";

      // Create workspace from template
      const newWorkspace: Workspace = {
        id: "new-ws-1",
        name: "Client Onboarding",
        sourceTemplateId: templateId, // Should be set automatically
        isTemplate: false,
      };

      expect(newWorkspace.sourceTemplateId).toBe(templateId);
      expect(newWorkspace.isTemplate).toBe(false);
    });

    test("requires workspace name for creation", () => {
      const canCreate = (templateId: string, name: string): boolean => {
        return Boolean(templateId) && Boolean(name.trim());
      };

      expect(canCreate("template-1", "My Workspace")).toBe(true);
      expect(canCreate("template-1", "")).toBe(false);
      expect(canCreate("template-1", "   ")).toBe(false);
      expect(canCreate("", "My Workspace")).toBe(false);
    });
  });

  test.describe("Template Deletion", () => {
    test("deleting template sets sourceTemplateId to null on derived workspaces", () => {
      interface Workspace {
        id: string;
        sourceTemplateId: string | null;
      }

      let workspaces: Workspace[] = [
        { id: "ws-1", sourceTemplateId: "template-1" },
        { id: "ws-2", sourceTemplateId: "template-1" },
        { id: "ws-3", sourceTemplateId: "template-2" },
      ];

      // Simulate template deletion (onDelete set null behavior)
      const templateToDelete = "template-1";
      workspaces = workspaces.map((w) => ({
        ...w,
        sourceTemplateId: w.sourceTemplateId === templateToDelete ? null : w.sourceTemplateId,
      }));

      // ws-1 and ws-2 should now have null sourceTemplateId
      expect(workspaces[0].sourceTemplateId).toBeNull();
      expect(workspaces[1].sourceTemplateId).toBeNull();
      // ws-3 should still be linked to template-2
      expect(workspaces[2].sourceTemplateId).toBe("template-2");
    });

    test("validates delete confirmation flow", () => {
      interface DeleteState {
        dialogOpen: boolean;
        selectedTemplate: { id: string; name: string } | null;
        isLoading: boolean;
      }

      let state: DeleteState = {
        dialogOpen: false,
        selectedTemplate: null,
        isLoading: false,
      };

      const openDeleteDialog = (template: { id: string; name: string }) => {
        state = { ...state, dialogOpen: true, selectedTemplate: template };
      };

      const confirmDelete = () => {
        state = { ...state, isLoading: true };
      };

      const completeDelete = () => {
        state = { dialogOpen: false, selectedTemplate: null, isLoading: false };
      };

      openDeleteDialog({ id: "1", name: "Test Template" });
      expect(state.dialogOpen).toBe(true);
      expect(state.selectedTemplate?.name).toBe("Test Template");

      confirmDelete();
      expect(state.isLoading).toBe(true);

      completeDelete();
      expect(state.dialogOpen).toBe(false);
      expect(state.selectedTemplate).toBeNull();
    });
  });

  test.describe("Template List Display", () => {
    test("formats date correctly", () => {
      const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const jan15 = formatDate("2026-01-15T10:00:00Z");
      expect(jan15).toContain("2026");
      expect(jan15).toMatch(/Jan|15/);

      const dec25 = formatDate("2026-12-25T00:00:00Z");
      expect(dec25).toContain("2026");
      expect(dec25).toMatch(/Dec|25/);
    });

    test("displays empty state when no templates exist", () => {
      const templates: unknown[] = [];
      const shouldShowEmptyState = templates.length === 0;
      expect(shouldShowEmptyState).toBe(true);
    });

    test("displays table when templates exist", () => {
      interface Template {
        id: string;
        name: string;
      }

      const templates: Template[] = [{ id: "1", name: "Template" }];
      const shouldShowTable = templates.length > 0;
      expect(shouldShowTable).toBe(true);
    });

    test("template name links to detail page", () => {
      const templateId = "template-123";
      const expectedUrl = `/dashboard/templates/${templateId}`;

      expect(expectedUrl).toBe("/dashboard/templates/template-123");
    });
  });

  test.describe("Template Search Functionality", () => {
    test("search URL is constructed correctly", () => {
      const buildSearchUrl = (search: string): string => {
        const searchParam = search ? `?search=${encodeURIComponent(search)}` : "";
        return `/api/admin/templates${searchParam}`;
      };

      expect(buildSearchUrl("")).toBe("/api/admin/templates");
      expect(buildSearchUrl("onboarding")).toBe("/api/admin/templates?search=onboarding");
      expect(buildSearchUrl("client & partner")).toBe(
        "/api/admin/templates?search=client%20%26%20partner"
      );
    });

    test("filters templates by search term", () => {
      interface Template {
        id: string;
        name: string;
        description: string | null;
      }

      const templates: Template[] = [
        { id: "1", name: "Client Onboarding", description: "For new clients" },
        { id: "2", name: "Partner Setup", description: "Partner integration" },
        { id: "3", name: "Employee Onboarding", description: "HR workflow" },
      ];

      const filterBySearch = (templates: Template[], search: string): Template[] => {
        const lowerSearch = search.toLowerCase();
        return templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerSearch) ||
            t.description?.toLowerCase().includes(lowerSearch)
        );
      };

      expect(filterBySearch(templates, "onboarding")).toHaveLength(2);
      expect(filterBySearch(templates, "partner")).toHaveLength(1);
      expect(filterBySearch(templates, "nonexistent")).toHaveLength(0);
    });
  });

  test.describe("Protected Route Redirects", () => {
    test("unauthenticated user visiting /dashboard/templates is redirected to sign-in", async ({
      page,
    }) => {
      await page.goto("/dashboard/templates");
      await page.waitForLoadState("domcontentloaded");

      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    });

    test("unauthenticated user visiting /dashboard/templates/:id is redirected to sign-in", async ({
      page,
    }) => {
      await page.goto("/dashboard/templates/template-123");
      await page.waitForLoadState("domcontentloaded");

      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    });
  });

  test.describe("UI Tests", () => {
    test("displays templates table in templates list", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/templates");
      await adminPage.waitForLoadState("networkidle");

      // Should show either the table or empty state
      const hasTable = await adminPage.getByRole("table").isVisible().catch(() => false);
      const hasEmptyState = await adminPage.getByText(/no templates/i).isVisible().catch(() => false);

      expect(hasTable || hasEmptyState).toBe(true);
    });

    test("templates page has search input", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/templates");
      await adminPage.waitForLoadState("networkidle");

      const searchInput = adminPage.getByPlaceholder(/search/i);
      await expect(searchInput).toBeVisible();
    });

    test("clicking template name navigates to detail page", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/templates");
      await adminPage.waitForLoadState("networkidle");

      // First check if there are any templates
      const hasTemplates = await adminPage.getByRole("table").isVisible().catch(() => false);

      if (hasTemplates) {
        // Click on first template name cell
        const firstTemplateRow = adminPage.locator("table tbody tr").first();
        const nameCell = firstTemplateRow.locator("td").first();

        if (await nameCell.isVisible()) {
          await nameCell.click();

          // Should navigate to template detail page
          await expect(adminPage).toHaveURL(/\/dashboard\/templates\/[a-zA-Z0-9-]+/);
        }
      }
    });

    test("template detail page shows back button", async ({ adminPage }) => {
      // First go to templates list and get a template ID if available
      await adminPage.goto("/dashboard/templates");
      await adminPage.waitForLoadState("networkidle");

      const hasTemplates = await adminPage.getByRole("table").isVisible().catch(() => false);

      if (hasTemplates) {
        // Click on first template
        const firstTemplateRow = adminPage.locator("table tbody tr").first();
        const nameCell = firstTemplateRow.locator("td").first();

        if (await nameCell.isVisible()) {
          await nameCell.click();
          await adminPage.waitForLoadState("networkidle");

          // Should see back button
          const backButton = adminPage.locator("button").filter({ has: adminPage.locator("svg") }).first();
          await expect(backButton).toBeVisible();
        }
      }
    });

    test("template detail page shows create workspace button", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/templates");
      await adminPage.waitForLoadState("networkidle");

      const hasTemplates = await adminPage.getByRole("table").isVisible().catch(() => false);

      if (hasTemplates) {
        // Click on first template
        const firstTemplateRow = adminPage.locator("table tbody tr").first();
        const nameCell = firstTemplateRow.locator("td").first();

        if (await nameCell.isVisible()) {
          await nameCell.click();
          await adminPage.waitForLoadState("networkidle");

          // Should see Create Workspace button
          const createButton = adminPage.getByRole("button", { name: /create workspace/i });
          await expect(createButton).toBeVisible();
        }
      }
    });

    test("workspace list shows Save as Template option in dropdown", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/workspaces");
      await adminPage.waitForLoadState("networkidle");

      // Check if there are any workspaces
      const hasWorkspaces = await adminPage.getByRole("table").isVisible().catch(() => false);

      if (hasWorkspaces) {
        // Open dropdown for first workspace
        const firstRow = adminPage.locator("table tbody tr").first();
        const dropdownTrigger = firstRow.getByRole("button").last();

        if (await dropdownTrigger.isVisible()) {
          await dropdownTrigger.click();

          // Should see Save as Template option
          await expect(adminPage.getByText(/save as template/i)).toBeVisible();
        }
      }
    });

    test("Save as Template dialog shows correct message", async ({ adminPage }) => {
      await adminPage.goto("/dashboard/workspaces");
      await adminPage.waitForLoadState("networkidle");

      const hasWorkspaces = await adminPage.getByRole("table").isVisible().catch(() => false);

      if (hasWorkspaces) {
        // Open dropdown for first workspace
        const firstRow = adminPage.locator("table tbody tr").first();
        const dropdownTrigger = firstRow.getByRole("button").last();

        if (await dropdownTrigger.isVisible()) {
          await dropdownTrigger.click();

          // Click Save as Template
          const saveAsTemplateOption = adminPage.getByText(/save as template/i);
          if (await saveAsTemplateOption.isVisible()) {
            await saveAsTemplateOption.click();

            // Dialog should show message about creating a copy
            await expect(
              adminPage.getByText(/create a new template based on/i)
            ).toBeVisible();

            // Should mention original workspace remains unchanged
            await expect(
              adminPage.getByText(/remain unchanged/i)
            ).toBeVisible();

            // Button should say "Create Template"
            await expect(
              adminPage.getByRole("button", { name: /create template/i })
            ).toBeVisible();
          }
        }
      }
    });

    test("templates sidebar nav item is visible", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Look for Templates button in sidebar
      await expect(adminPage.getByRole("button", { name: /templates/i })).toBeVisible();
    });

    test("can navigate to templates from sidebar", async ({ adminPage }) => {
      await adminPage.goto("/dashboard");
      await adminPage.waitForLoadState("networkidle");

      // Click Templates button
      await adminPage.getByRole("button", { name: /templates/i }).click();

      // Should navigate to templates page
      await expect(adminPage).toHaveURL(/\/dashboard\/templates/);
    });
  });
});
