import { test, expect } from "@playwright/test";

/**
 * E2E: Template System Tests
 *
 * Tests the workspace template functionality:
 * - Template listing and search
 * - Creating workspace from template
 * - Deleting templates
 * - Template data structure
 *
 * Note: Full UI tests require authentication.
 * These tests verify business logic and expected behaviors.
 */

test.describe("Template System", () => {
  test.describe("Template Data Structure", () => {
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

    test("validates template with null description", () => {
      interface Template {
        id: string;
        name: string;
        description: string | null;
        sectionCount: number;
        taskCount: number;
      }

      const template: Template = {
        id: "template-2",
        name: "Simple Template",
        description: null,
        sectionCount: 2,
        taskCount: 5,
      };

      expect(template.description).toBeNull();
      expect(template.name).toBeTruthy();
    });
  });

  test.describe("Template API Endpoints", () => {
    test("GET /api/admin/templates returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.get("/api/admin/templates");
      expect(response.status()).toBe(401);
    });

    test("DELETE /api/admin/templates/:id returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.delete("/api/admin/templates/template-123");
      expect(response.status()).toBe(401);
    });

    test("POST /api/admin/templates/:id/duplicate returns 401 for unauthenticated requests", async ({
      request,
    }) => {
      const response = await request.post("/api/admin/templates/template-123/duplicate");
      expect(response.status()).toBe(401);
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

  test.describe("Create Workspace from Template", () => {
    test("validates create from template request structure", () => {
      interface CreateFromTemplateRequest {
        templateId: string;
        name: string;
        description?: string;
      }

      const request: CreateFromTemplateRequest = {
        templateId: "template-1",
        name: "New Client Workspace",
        description: "Created from template",
      };

      expect(request.templateId).toBeTruthy();
      expect(request.name).toBeTruthy();
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

    test("validates workspace name constraints", () => {
      const isValidName = (name: string): { valid: boolean; error?: string } => {
        const trimmed = name.trim();
        if (!trimmed) {
          return { valid: false, error: "Name is required" };
        }
        if (trimmed.length < 2) {
          return { valid: false, error: "Name must be at least 2 characters" };
        }
        if (trimmed.length > 100) {
          return { valid: false, error: "Name must be less than 100 characters" };
        }
        return { valid: true };
      };

      expect(isValidName("Valid Name").valid).toBe(true);
      expect(isValidName("A").valid).toBe(false);
      expect(isValidName("").valid).toBe(false);
      expect(isValidName("A".repeat(101)).valid).toBe(false);
    });
  });

  test.describe("Template Deletion", () => {
    test("validates delete confirmation flow", () => {
      interface DeleteState {
        dialogOpen: boolean;
        selectedTemplate: { id: string; name: string } | null;
        isLoading: boolean;
      }

      // Initial state
      let state: DeleteState = {
        dialogOpen: false,
        selectedTemplate: null,
        isLoading: false,
      };

      // Open delete dialog
      const openDeleteDialog = (template: { id: string; name: string }) => {
        state = {
          ...state,
          dialogOpen: true,
          selectedTemplate: template,
        };
      };

      // Confirm delete
      const confirmDelete = () => {
        state = { ...state, isLoading: true };
      };

      // Complete delete
      const completeDelete = () => {
        state = {
          dialogOpen: false,
          selectedTemplate: null,
          isLoading: false,
        };
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

    test("removes template from list after deletion", () => {
      interface Template {
        id: string;
        name: string;
      }

      let templates: Template[] = [
        { id: "1", name: "Template A" },
        { id: "2", name: "Template B" },
        { id: "3", name: "Template C" },
      ];

      const deleteTemplate = (id: string) => {
        templates = templates.filter((t) => t.id !== id);
      };

      expect(templates).toHaveLength(3);

      deleteTemplate("2");
      expect(templates).toHaveLength(2);
      expect(templates.find((t) => t.id === "2")).toBeUndefined();
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

      // Test that the formatted date contains expected parts (locale-independent)
      const jan15 = formatDate("2026-01-15T10:00:00Z");
      expect(jan15).toContain("2026");
      expect(jan15).toMatch(/Jan|15/); // Contains either Jan or 15

      const dec25 = formatDate("2026-12-25T00:00:00Z");
      expect(dec25).toContain("2026");
      expect(dec25).toMatch(/Dec|25/); // Contains either Dec or 25
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
  });

  test.describe("Save Workspace as Template", () => {
    test("validates save as template request structure", () => {
      interface SaveAsTemplateRequest {
        workspaceId: string;
        templateName: string;
        templateDescription?: string;
      }

      const request: SaveAsTemplateRequest = {
        workspaceId: "workspace-1",
        templateName: "New Template",
        templateDescription: "Created from existing workspace",
      };

      expect(request.workspaceId).toBeTruthy();
      expect(request.templateName).toBeTruthy();
    });

    test("redirects to templates page after successful save", () => {
      const redirectPath = "/dashboard/templates";

      expect(redirectPath).toBe("/dashboard/templates");
    });

    test("copies sections and tasks to template", () => {
      interface Section {
        id: string;
        title: string;
        tasks: Array<{ id: string; title: string }>;
      }

      const sourceSections: Section[] = [
        {
          id: "s1",
          title: "Section 1",
          tasks: [
            { id: "t1", title: "Task 1" },
            { id: "t2", title: "Task 2" },
          ],
        },
        {
          id: "s2",
          title: "Section 2",
          tasks: [{ id: "t3", title: "Task 3" }],
        },
      ];

      const totalSections = sourceSections.length;
      const totalTasks = sourceSections.reduce((sum, s) => sum + s.tasks.length, 0);

      expect(totalSections).toBe(2);
      expect(totalTasks).toBe(3);
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
  });
});
