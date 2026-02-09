import { database } from "../index";
import type {
  FormPage,
  NewFormPage,
  FormPageUpdate,
  FormElement,
  NewFormElement,
  FormElementUpdate,
  FormConfig,
} from "../schemas/main";

// Form page with nested elements
export interface FormPageWithElements extends FormPage {
  elements: FormElement[];
}

// Form config with nested pages and elements
export interface FormConfigWithPages extends FormConfig {
  pages: FormPageWithElements[];
}

// Helper to parse JSON fields that may come back as strings from the database
function parseElementJsonFields(el: FormElement): FormElement {
  return {
    ...el,
    options: el.options
      ? typeof el.options === "string"
        ? JSON.parse(el.options)
        : el.options
      : null,
    validation: el.validation
      ? typeof el.validation === "string"
        ? JSON.parse(el.validation)
        : el.validation
      : null,
  } as FormElement;
}

export const formService = {
  // =====================
  // FORM PAGE OPERATIONS
  // =====================

  /**
   * Create a new form page
   */
  async createPage(
    input: Omit<NewFormPage, "id" | "createdAt" | "updatedAt">
  ): Promise<FormPage> {
    return database
      .insertInto("form_page")
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  /**
   * Get all pages for a form config, ordered by position
   */
  async getPagesByFormConfigId(formConfigId: string): Promise<FormPage[]> {
    return database
      .selectFrom("form_page")
      .selectAll()
      .where("formConfigId", "=", formConfigId)
      .orderBy("position", "asc")
      .execute();
  },

  /**
   * Update a form page
   */
  async updatePage(
    id: string,
    input: Omit<FormPageUpdate, "id" | "formConfigId" | "createdAt">
  ): Promise<FormPage | null> {
    const result = await database
      .updateTable("form_page")
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  },

  /**
   * Delete a form page
   */
  async deletePage(id: string): Promise<boolean> {
    const result = await database
      .deleteFrom("form_page")
      .where("id", "=", id)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Reorder pages within a form config
   */
  async reorderPages(formConfigId: string, pageIds: string[]): Promise<void> {
    for (let i = 0; i < pageIds.length; i++) {
      await database
        .updateTable("form_page")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", pageIds[i])
        .where("formConfigId", "=", formConfigId)
        .execute();
    }
  },

  // =====================
  // FORM ELEMENT OPERATIONS
  // =====================

  /**
   * Create a new form element
   */
  async createElement(
    input: Omit<NewFormElement, "id" | "createdAt" | "updatedAt">
  ): Promise<FormElement> {
    // Serialize JSON fields for Neon/PostgreSQL
    const values = {
      ...input,
      options: input.options ? JSON.stringify(input.options) : null,
      validation: input.validation ? JSON.stringify(input.validation) : null,
    };

    const result = await database
      .insertInto("form_element")
      .values(values as NewFormElement)
      .returningAll()
      .executeTakeFirstOrThrow();

    return parseElementJsonFields(result);
  },

  /**
   * Get all elements for a page, ordered by position
   */
  async getElementsByPageId(formPageId: string): Promise<FormElement[]> {
    const results = await database
      .selectFrom("form_element")
      .selectAll()
      .where("formPageId", "=", formPageId)
      .orderBy("position", "asc")
      .execute();

    return results.map(parseElementJsonFields);
  },

  /**
   * Update a form element
   */
  async updateElement(
    id: string,
    input: Omit<FormElementUpdate, "id" | "formPageId" | "createdAt">
  ): Promise<FormElement | null> {
    // Serialize JSON fields for Neon/PostgreSQL
    const setValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only include defined fields
    if (input.type !== undefined) setValues.type = input.type;
    if (input.label !== undefined) setValues.label = input.label;
    if (input.placeholder !== undefined) setValues.placeholder = input.placeholder;
    if (input.helpText !== undefined) setValues.helpText = input.helpText;
    if (input.required !== undefined) setValues.required = input.required;
    if (input.position !== undefined) setValues.position = input.position;
    if (input.options !== undefined) {
      setValues.options = input.options ? JSON.stringify(input.options) : null;
    }
    if (input.validation !== undefined) {
      setValues.validation = input.validation ? JSON.stringify(input.validation) : null;
    }

    const result = await database
      .updateTable("form_element")
      .set(setValues)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    if (!result) return null;

    return parseElementJsonFields(result);
  },

  /**
   * Delete a form element
   */
  async deleteElement(id: string): Promise<boolean> {
    const result = await database
      .deleteFrom("form_element")
      .where("id", "=", id)
      .executeTakeFirst();

    return (result.numDeletedRows ?? 0n) > 0n;
  },

  /**
   * Reorder elements within a page
   */
  async reorderElements(formPageId: string, elementIds: string[]): Promise<void> {
    for (let i = 0; i < elementIds.length; i++) {
      await database
        .updateTable("form_element")
        .set({ position: i, updatedAt: new Date() })
        .where("id", "=", elementIds[i])
        .where("formPageId", "=", formPageId)
        .execute();
    }
  },

  // =====================
  // COMBINED QUERIES
  // =====================

  /**
   * Get form config by task ID with all pages and elements
   */
  async getFormByTaskId(taskId: string): Promise<FormConfigWithPages | null> {
    const formConfig = await database
      .selectFrom("form_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    if (!formConfig) {
      return null;
    }

    return this.getFormWithPagesAndElements(formConfig.id);
  },

  /**
   * Save full form config (full replace in transaction)
   * Deletes all existing pages/elements and recreates from input
   */
  async saveFullFormConfig(
    taskId: string,
    pages: Array<{
      id: string;
      title: string;
      position: number;
      elements: Array<{
        id: string;
        type: string;
        label: string;
        placeholder?: string | null;
        helpText?: string | null;
        required?: boolean;
        options?: Array<{ label: string; value: string }> | null;
        validation?: Record<string, unknown> | null;
        position: number;
      }>;
    }>
  ): Promise<FormConfigWithPages> {
    // Get or create form config
    let formConfig = await database
      .selectFrom("form_config")
      .selectAll()
      .where("taskId", "=", taskId)
      .executeTakeFirst();

    if (!formConfig) {
      formConfig = await database
        .insertInto("form_config")
        .values({ taskId })
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    // Delete all existing pages (cascade will delete elements)
    await database
      .deleteFrom("form_page")
      .where("formConfigId", "=", formConfig.id)
      .execute();

    // Create new pages and elements
    const createdPages: FormPageWithElements[] = [];

    for (const pageInput of pages) {
      const page = await database
        .insertInto("form_page")
        .values({
          formConfigId: formConfig.id,
          title: pageInput.title,
          position: pageInput.position,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const createdElements: FormElement[] = [];

      for (const elementInput of pageInput.elements) {
        const element = await database
          .insertInto("form_element")
          .values({
            formPageId: page.id,
            type: elementInput.type,
            label: elementInput.label,
            placeholder: elementInput.placeholder ?? null,
            helpText: elementInput.helpText ?? null,
            required: elementInput.required ?? false,
            options: elementInput.options ? JSON.stringify(elementInput.options) : null,
            validation: elementInput.validation ? JSON.stringify(elementInput.validation) : null,
            position: elementInput.position,
          } as NewFormElement)
          .returningAll()
          .executeTakeFirstOrThrow();

        createdElements.push(parseElementJsonFields(element));
      }

      createdPages.push({
        ...page,
        elements: createdElements,
      });
    }

    // Update form config timestamp
    const updatedConfig = await database
      .updateTable("form_config")
      .set({ updatedAt: new Date() })
      .where("id", "=", formConfig.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      ...updatedConfig,
      pages: createdPages,
    };
  },

  /**
   * Get a form config with all its pages and elements
   */
  async getFormWithPagesAndElements(
    formConfigId: string
  ): Promise<FormConfigWithPages | null> {
    // Get the form config
    const formConfig = await database
      .selectFrom("form_config")
      .selectAll()
      .where("id", "=", formConfigId)
      .executeTakeFirst();

    if (!formConfig) {
      return null;
    }

    // Get all pages ordered by position
    const pages = await this.getPagesByFormConfigId(formConfigId);

    // Get elements for each page
    const pagesWithElements: FormPageWithElements[] = [];
    for (const page of pages) {
      const elements = await this.getElementsByPageId(page.id);
      pagesWithElements.push({
        ...page,
        elements,
      });
    }

    return {
      ...formConfig,
      pages: pagesWithElements,
    };
  },
};
