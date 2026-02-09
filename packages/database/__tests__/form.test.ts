import { describe, it, expect, afterAll } from "vitest";
import { database } from "../index";
import { formService } from "../services/form";
import { configService } from "../services/config";
import { taskService } from "../services/task";
import { sectionService } from "../services/section";
import { workspaceService } from "../services/workspace";

describe("FormService", () => {
  // Track created IDs for cleanup
  const createdWorkspaceIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdTaskIds: string[] = [];
  const createdFormConfigIds: string[] = [];
  const createdFormPageIds: string[] = [];
  const createdFormElementIds: string[] = [];

  afterAll(async () => {
    // Cleanup in reverse order
    for (const id of createdFormElementIds) {
      await database.deleteFrom("form_element").where("id", "=", id).execute();
    }
    for (const id of createdFormPageIds) {
      await database.deleteFrom("form_page").where("id", "=", id).execute();
    }
    for (const id of createdFormConfigIds) {
      await database.deleteFrom("form_config").where("id", "=", id).execute();
    }
    for (const id of createdTaskIds) {
      await database.deleteFrom("task").where("id", "=", id).execute();
    }
    for (const id of createdSectionIds) {
      await database.deleteFrom("section").where("id", "=", id).execute();
    }
    for (const id of createdWorkspaceIds) {
      await database.deleteFrom("workspace").where("id", "=", id).execute();
    }
  });

  // Helper to create a form config
  async function createTestFormConfig() {
    const workspace = await workspaceService.create({ name: `Form Test ${Date.now()}` });
    createdWorkspaceIds.push(workspace.id);

    const section = await sectionService.create({
      workspaceId: workspace.id,
      title: "Test Section",
      position: 0,
    });
    createdSectionIds.push(section.id);

    const task = await taskService.create({
      sectionId: section.id,
      title: "Form Task",
      position: 0,
      type: "FORM",
    });
    createdTaskIds.push(task.id);

    const formConfig = await configService.createFormConfig(task.id);
    createdFormConfigIds.push(formConfig.id);

    return formConfig;
  }

  describe("FormPage", () => {
    describe("createPage", () => {
      it("should create a form page", async () => {
        const formConfig = await createTestFormConfig();

        const page = await formService.createPage({
          formConfigId: formConfig.id,
          title: "Personal Information",
          position: 0,
        });
        createdFormPageIds.push(page.id);

        expect(page.id).toBeDefined();
        expect(page.formConfigId).toBe(formConfig.id);
        expect(page.title).toBe("Personal Information");
        expect(page.position).toBe(0);
      });

      it("should create a page without title", async () => {
        const formConfig = await createTestFormConfig();

        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        expect(page.title).toBeNull();
      });
    });

    describe("getPagesByFormConfigId", () => {
      it("should return pages ordered by position", async () => {
        const formConfig = await createTestFormConfig();

        // Create out of order
        const page2 = await formService.createPage({
          formConfigId: formConfig.id,
          title: "Second",
          position: 1,
        });
        createdFormPageIds.push(page2.id);

        const page1 = await formService.createPage({
          formConfigId: formConfig.id,
          title: "First",
          position: 0,
        });
        createdFormPageIds.push(page1.id);

        const pages = await formService.getPagesByFormConfigId(formConfig.id);

        expect(pages).toHaveLength(2);
        expect(pages[0].title).toBe("First");
        expect(pages[1].title).toBe("Second");
      });
    });

    describe("updatePage", () => {
      it("should update page title", async () => {
        const formConfig = await createTestFormConfig();

        const page = await formService.createPage({
          formConfigId: formConfig.id,
          title: "Original",
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const updated = await formService.updatePage(page.id, {
          title: "Updated Title",
        });

        expect(updated!.title).toBe("Updated Title");
      });
    });

    describe("deletePage", () => {
      it("should delete a page", async () => {
        const formConfig = await createTestFormConfig();

        const page = await formService.createPage({
          formConfigId: formConfig.id,
          title: "To Delete",
          position: 0,
        });
        // Don't add to cleanup - we're deleting it

        const result = await formService.deletePage(page.id);
        expect(result).toBe(true);

        const pages = await formService.getPagesByFormConfigId(formConfig.id);
        expect(pages).toHaveLength(0);
      });
    });

    describe("reorderPages", () => {
      it("should reorder pages", async () => {
        const formConfig = await createTestFormConfig();

        const page1 = await formService.createPage({
          formConfigId: formConfig.id,
          title: "A",
          position: 0,
        });
        createdFormPageIds.push(page1.id);

        const page2 = await formService.createPage({
          formConfigId: formConfig.id,
          title: "B",
          position: 1,
        });
        createdFormPageIds.push(page2.id);

        // Reorder: B, A
        await formService.reorderPages(formConfig.id, [page2.id, page1.id]);

        const pages = await formService.getPagesByFormConfigId(formConfig.id);
        expect(pages[0].title).toBe("B");
        expect(pages[1].title).toBe("A");
      });
    });
  });

  describe("FormElement", () => {
    describe("createElement", () => {
      it("should create a text element", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const element = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "Full Name",
          position: 0,
        });
        createdFormElementIds.push(element.id);

        expect(element.id).toBeDefined();
        expect(element.formPageId).toBe(page.id);
        expect(element.type).toBe("text");
        expect(element.label).toBe("Full Name");
        expect(element.required).toBe(false);
      });

      it("should create element with placeholder and help text", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const element = await formService.createElement({
          formPageId: page.id,
          type: "email",
          label: "Email Address",
          placeholder: "you@example.com",
          helpText: "We will never share your email",
          required: true,
          position: 0,
        });
        createdFormElementIds.push(element.id);

        expect(element.placeholder).toBe("you@example.com");
        expect(element.helpText).toBe("We will never share your email");
        expect(element.required).toBe(true);
      });

      it("should create select element with options", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const options = [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
          { value: "uk", label: "United Kingdom" },
        ];

        const element = await formService.createElement({
          formPageId: page.id,
          type: "select",
          label: "Country",
          options,
          position: 0,
        });
        createdFormElementIds.push(element.id);

        expect(element.options).toEqual(options);
      });

      it("should create element with validation rules", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const validation = {
          minLength: { value: 2, message: "Must be at least 2 characters" },
          maxLength: { value: 50, message: "Must be less than 50 characters" },
          pattern: { value: "^[A-Za-z]+$", message: "Only letters allowed" },
        };

        const element = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "First Name",
          validation,
          position: 0,
        });
        createdFormElementIds.push(element.id);

        expect(element.validation).toEqual(validation);
      });

      it("should create all element types", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const types = ["text", "textarea", "select", "radio", "checkbox", "file", "date", "number", "email", "phone"] as const;

        for (let i = 0; i < types.length; i++) {
          const element = await formService.createElement({
            formPageId: page.id,
            type: types[i],
            label: `Element ${types[i]}`,
            position: i,
          });
          createdFormElementIds.push(element.id);

          expect(element.type).toBe(types[i]);
        }
      });
    });

    describe("getElementsByPageId", () => {
      it("should return elements ordered by position", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        // Create out of order
        const el2 = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "Second",
          position: 1,
        });
        createdFormElementIds.push(el2.id);

        const el1 = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "First",
          position: 0,
        });
        createdFormElementIds.push(el1.id);

        const elements = await formService.getElementsByPageId(page.id);

        expect(elements).toHaveLength(2);
        expect(elements[0].label).toBe("First");
        expect(elements[1].label).toBe("Second");
      });
    });

    describe("updateElement", () => {
      it("should update element label", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const element = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "Original",
          position: 0,
        });
        createdFormElementIds.push(element.id);

        const updated = await formService.updateElement(element.id, {
          label: "Updated Label",
        });

        expect(updated!.label).toBe("Updated Label");
      });

      it("should update element validation", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const element = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "Test",
          position: 0,
        });
        createdFormElementIds.push(element.id);

        const newValidation = {
          required: { value: true, message: "This field is required" },
          minLength: { value: 5, message: "Minimum 5 characters" },
        };

        const updated = await formService.updateElement(element.id, {
          validation: newValidation,
        });

        expect(updated!.validation).toEqual(newValidation);
      });
    });

    describe("deleteElement", () => {
      it("should delete an element", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const element = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "To Delete",
          position: 0,
        });
        // Don't add to cleanup

        const result = await formService.deleteElement(element.id);
        expect(result).toBe(true);

        const elements = await formService.getElementsByPageId(page.id);
        expect(elements).toHaveLength(0);
      });
    });

    describe("reorderElements", () => {
      it("should reorder elements within a page", async () => {
        const formConfig = await createTestFormConfig();
        const page = await formService.createPage({
          formConfigId: formConfig.id,
          position: 0,
        });
        createdFormPageIds.push(page.id);

        const el1 = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "A",
          position: 0,
        });
        createdFormElementIds.push(el1.id);

        const el2 = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "B",
          position: 1,
        });
        createdFormElementIds.push(el2.id);

        const el3 = await formService.createElement({
          formPageId: page.id,
          type: "text",
          label: "C",
          position: 2,
        });
        createdFormElementIds.push(el3.id);

        // Reorder: C, A, B
        await formService.reorderElements(page.id, [el3.id, el1.id, el2.id]);

        const elements = await formService.getElementsByPageId(page.id);
        expect(elements[0].label).toBe("C");
        expect(elements[1].label).toBe("A");
        expect(elements[2].label).toBe("B");
      });
    });
  });

  describe("getFormWithPagesAndElements", () => {
    it("should return form config with nested pages and elements", async () => {
      const formConfig = await createTestFormConfig();

      // Create pages
      const page1 = await formService.createPage({
        formConfigId: formConfig.id,
        title: "Page 1",
        position: 0,
      });
      createdFormPageIds.push(page1.id);

      const page2 = await formService.createPage({
        formConfigId: formConfig.id,
        title: "Page 2",
        position: 1,
      });
      createdFormPageIds.push(page2.id);

      // Create elements in page1
      const el1 = await formService.createElement({
        formPageId: page1.id,
        type: "text",
        label: "Name",
        position: 0,
      });
      createdFormElementIds.push(el1.id);

      const el2 = await formService.createElement({
        formPageId: page1.id,
        type: "email",
        label: "Email",
        position: 1,
      });
      createdFormElementIds.push(el2.id);

      // Create element in page2
      const el3 = await formService.createElement({
        formPageId: page2.id,
        type: "textarea",
        label: "Comments",
        position: 0,
      });
      createdFormElementIds.push(el3.id);

      const result = await formService.getFormWithPagesAndElements(formConfig.id);

      expect(result).toBeDefined();
      expect(result!.pages).toHaveLength(2);
      expect(result!.pages[0].title).toBe("Page 1");
      expect(result!.pages[0].elements).toHaveLength(2);
      expect(result!.pages[0].elements[0].label).toBe("Name");
      expect(result!.pages[0].elements[1].label).toBe("Email");
      expect(result!.pages[1].title).toBe("Page 2");
      expect(result!.pages[1].elements).toHaveLength(1);
      expect(result!.pages[1].elements[0].label).toBe("Comments");
    });
  });
});
