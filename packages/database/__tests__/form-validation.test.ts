import { describe, it, expect } from "vitest";
import { buildFormValidationSchema, validateSubmission } from "../services/form-validation";
import type { FormElement } from "../schemas/main";

// Helper to create a test element
function createTestElement(
  overrides: Partial<FormElement> & { id: string; type: string }
): FormElement {
  return {
    formPageId: "page_1",
    label: "Test Field",
    placeholder: null,
    helpText: null,
    required: false,
    options: null,
    validation: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as FormElement;
}

describe("buildFormValidationSchema", () => {
  it("should build schema for required text field", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "text", required: true }),
    ];

    const schema = buildFormValidationSchema(elements);

    // Valid - has value
    expect(() => schema.parse({ el_1: "hello" })).not.toThrow();

    // Invalid - missing required field
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ el_1: "" })).toThrow();
  });

  it("should build schema for optional text field", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "text", required: false }),
    ];

    const schema = buildFormValidationSchema(elements);

    // Both valid
    expect(() => schema.parse({ el_1: "hello" })).not.toThrow();
    expect(() => schema.parse({})).not.toThrow();
    expect(() => schema.parse({ el_1: "" })).not.toThrow();
  });

  it("should validate text field minLength", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "text",
        validation: { minLength: 5 },
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "hello" })).not.toThrow();
    expect(() => schema.parse({ el_1: "hi" })).toThrow();
  });

  it("should validate text field maxLength", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "text",
        validation: { maxLength: 5 },
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "hello" })).not.toThrow();
    expect(() => schema.parse({ el_1: "hello world" })).toThrow();
  });

  it("should validate text field pattern", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "text",
        validation: { pattern: "^[A-Z]+$" },
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "HELLO" })).not.toThrow();
    expect(() => schema.parse({ el_1: "hello" })).toThrow();
  });

  it("should validate email field format", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "email", required: true }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "test@example.com" })).not.toThrow();
    expect(() => schema.parse({ el_1: "not-an-email" })).toThrow();
  });

  it("should validate number field", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "number", required: true }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: 42 })).not.toThrow();
    expect(() => schema.parse({ el_1: "42" })).not.toThrow(); // Coerce string to number
  });

  it("should validate number field min", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "number",
        validation: { min: 10 },
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: 15 })).not.toThrow();
    expect(() => schema.parse({ el_1: 5 })).toThrow();
  });

  it("should validate number field max", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "number",
        validation: { max: 100 },
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: 50 })).not.toThrow();
    expect(() => schema.parse({ el_1: 150 })).toThrow();
  });

  it("should validate select field with options", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "select",
        required: true,
        options: [
          { label: "Option A", value: "a" },
          { label: "Option B", value: "b" },
        ],
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "a" })).not.toThrow();
    expect(() => schema.parse({ el_1: "b" })).not.toThrow();
    expect(() => schema.parse({ el_1: "c" })).toThrow(); // Invalid option
  });

  it("should validate radio field with options", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "radio",
        required: true,
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "yes" })).not.toThrow();
    expect(() => schema.parse({ el_1: "maybe" })).toThrow();
  });

  it("should validate checkbox field as array", () => {
    const elements = [
      createTestElement({
        id: "el_1",
        type: "checkbox",
        required: true,
        options: [
          { label: "A", value: "a" },
          { label: "B", value: "b" },
          { label: "C", value: "c" },
        ],
      }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: ["a", "b"] })).not.toThrow();
    expect(() => schema.parse({ el_1: [] })).toThrow(); // Required means at least one
    expect(() => schema.parse({ el_1: ["a", "d"] })).toThrow(); // Invalid option
  });

  it("should validate date field", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "date", required: true }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() => schema.parse({ el_1: "2024-01-15" })).not.toThrow();
    expect(() => schema.parse({ el_1: "" })).toThrow();
  });

  it("should skip display-only elements", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "heading" }),
      createTestElement({ id: "el_2", type: "paragraph" }),
      createTestElement({ id: "el_3", type: "divider" }),
      createTestElement({ id: "el_4", type: "image" }),
    ];

    const schema = buildFormValidationSchema(elements);

    // Should accept empty object since no input fields
    expect(() => schema.parse({})).not.toThrow();
  });

  it("should handle multiple fields", () => {
    const elements = [
      createTestElement({ id: "name", type: "text", required: true }),
      createTestElement({ id: "email", type: "email", required: true }),
      createTestElement({ id: "age", type: "number", validation: { min: 18 } }),
    ];

    const schema = buildFormValidationSchema(elements);

    expect(() =>
      schema.parse({
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      })
    ).not.toThrow();

    // Missing required field
    expect(() =>
      schema.parse({
        name: "John Doe",
        age: 25,
      })
    ).toThrow();
  });
});

describe("validateSubmission", () => {
  it("should return success for valid data", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "text", required: true }),
    ];

    const result = validateSubmission(elements, { el_1: "hello" });

    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it("should return errors for invalid data", () => {
    const elements = [
      createTestElement({ id: "el_1", type: "text", required: true }),
    ];

    const result = validateSubmission(elements, {});

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.el_1).toBeDefined();
  });

  it("should return field-specific error messages", () => {
    const elements = [
      createTestElement({ id: "name", type: "text", required: true, label: "Full Name" }),
      createTestElement({ id: "email", type: "email", required: true, label: "Email Address" }),
    ];

    const result = validateSubmission(elements, { name: "", email: "invalid" });

    expect(result.success).toBe(false);
    expect(result.errors?.name).toBeDefined();
    expect(result.errors?.email).toBeDefined();
  });
});
