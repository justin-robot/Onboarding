import { z, ZodTypeAny } from "zod";
import type { FormElement } from "@repo/database";

// Display-only element types that don't need validation
const DISPLAY_ONLY_TYPES = ["heading", "paragraph", "divider", "image"];

interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<string, string>;
}

/**
 * Build a Zod validation schema from form elements
 */
export function buildFormValidationSchema(
  elements: FormElement[]
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const element of elements) {
    // Skip display-only elements
    if (DISPLAY_ONLY_TYPES.includes(element.type)) {
      continue;
    }

    const fieldSchema = buildFieldSchema(element);
    if (fieldSchema) {
      shape[element.id] = fieldSchema;
    }
  }

  return z.object(shape);
}

/**
 * Build Zod schema for a single field based on its type and validation rules
 */
function buildFieldSchema(element: FormElement): ZodTypeAny | null {
  const { type, required, options, validation } = element;
  const validationRules = (validation as Record<string, unknown>) || {};

  let schema: ZodTypeAny;

  switch (type) {
    case "text":
    case "textarea":
    case "phone":
      schema = buildStringSchema(required, validationRules);
      break;

    case "email":
      schema = buildEmailSchema(required, validationRules);
      break;

    case "number":
      schema = buildNumberSchema(required, validationRules);
      break;

    case "date":
      schema = buildDateSchema(required);
      break;

    case "select":
    case "radio":
      schema = buildSelectSchema(required, options);
      break;

    case "checkbox":
      schema = buildCheckboxSchema(required, options);
      break;

    case "file":
      // File validation is typically handled separately
      schema = required ? z.string().min(1, "File is required") : z.string().optional();
      break;

    default:
      // Unknown type - accept any string
      schema = z.string().optional();
  }

  return schema;
}

/**
 * Build string schema with optional validation rules
 */
function buildStringSchema(
  required: boolean | undefined,
  validation: Record<string, unknown>
): ZodTypeAny {
  let schema = z.string();

  // Add min/max length
  if (typeof validation.minLength === "number") {
    schema = schema.min(
      validation.minLength,
      `Must be at least ${validation.minLength} characters`
    );
  }

  if (typeof validation.maxLength === "number") {
    schema = schema.max(
      validation.maxLength,
      `Must be at most ${validation.maxLength} characters`
    );
  }

  // Add pattern validation
  if (typeof validation.pattern === "string") {
    try {
      const regex = new RegExp(validation.pattern);
      schema = schema.regex(regex, "Invalid format");
    } catch {
      // Invalid regex pattern - skip
    }
  }

  // Handle required
  if (required) {
    return schema.min(1, "This field is required");
  }

  // Optional: allow empty string or undefined
  return schema.optional().or(z.literal(""));
}

/**
 * Build email schema
 */
function buildEmailSchema(
  required: boolean | undefined,
  validation: Record<string, unknown>
): ZodTypeAny {
  let schema = z.string().email("Invalid email address");

  // Add min/max length if specified
  if (typeof validation.minLength === "number") {
    schema = schema.min(validation.minLength);
  }

  if (typeof validation.maxLength === "number") {
    schema = schema.max(validation.maxLength);
  }

  if (required) {
    return schema.min(1, "Email is required");
  }

  return schema.optional().or(z.literal(""));
}

/**
 * Build number schema with optional min/max
 */
function buildNumberSchema(
  required: boolean | undefined,
  validation: Record<string, unknown>
): ZodTypeAny {
  // Coerce string to number for form inputs
  let schema = z.coerce.number();

  if (typeof validation.min === "number") {
    schema = schema.min(validation.min, `Must be at least ${validation.min}`);
  }

  if (typeof validation.max === "number") {
    schema = schema.max(validation.max, `Must be at most ${validation.max}`);
  }

  if (required) {
    return schema;
  }

  // Optional number - allow undefined or empty string input
  return z.union([
    schema,
    z.literal("").transform(() => undefined),
    z.undefined(),
  ]);
}

/**
 * Build date schema (expects ISO date string)
 */
function buildDateSchema(required: boolean | undefined): ZodTypeAny {
  const schema = z.string().refine(
    (val) => {
      if (!val) return !required;
      // Validate ISO date format (YYYY-MM-DD)
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    },
    { message: required ? "Date is required" : "Invalid date format" }
  );

  if (required) {
    return schema.refine((val) => val.length > 0, "Date is required");
  }

  return schema.optional().or(z.literal(""));
}

/**
 * Build select/radio schema - must be one of the valid options
 */
function buildSelectSchema(
  required: boolean | undefined,
  options: Array<{ label: string; value: string }> | null | unknown
): ZodTypeAny {
  const optionsArray = Array.isArray(options) ? options : [];
  const validValues = optionsArray.map((opt) => opt.value);

  if (validValues.length === 0) {
    // No options defined - accept any string
    return required ? z.string().min(1, "Selection required") : z.string().optional();
  }

  // Create enum from valid values
  const enumSchema = z.enum(validValues as [string, ...string[]], {
    message: "Invalid selection",
  });

  if (required) {
    return enumSchema;
  }

  return enumSchema.optional().or(z.literal(""));
}

/**
 * Build checkbox schema - array of selected values
 */
function buildCheckboxSchema(
  required: boolean | undefined,
  options: Array<{ label: string; value: string }> | null | unknown
): ZodTypeAny {
  const optionsArray = Array.isArray(options) ? options : [];
  const validValues = optionsArray.map((opt) => opt.value);

  if (validValues.length === 0) {
    // No options - accept any string array
    return required
      ? z.array(z.string()).min(1, "At least one selection required")
      : z.array(z.string()).optional();
  }

  // Each item must be a valid option
  const itemSchema = z.enum(validValues as [string, ...string[]], {
    message: "Invalid selection",
  });

  const arraySchema = z.array(itemSchema);

  if (required) {
    return arraySchema.min(1, "At least one selection required");
  }

  return arraySchema.optional().or(z.array(z.never()).length(0));
}

/**
 * Validate submission data against form elements
 * Returns success/failure with field-specific errors
 */
export function validateSubmission(
  elements: FormElement[],
  data: Record<string, unknown>
): ValidationResult {
  const schema = buildFormValidationSchema(elements);

  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Convert Zod errors to field-specific error map
  const errors: Record<string, string> = {};

  for (const issue of result.error.issues) {
    const path = issue.path[0];
    if (typeof path === "string") {
      // Use first error for each field
      if (!errors[path]) {
        errors[path] = issue.message;
      }
    }
  }

  return {
    success: false,
    errors,
  };
}
