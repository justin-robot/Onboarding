// Form element types matching database schema plus display-only types
export type FormElementType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "date"
  | "number"
  | "email"
  | "phone"
  // Display-only types
  | "heading"
  | "paragraph"
  | "image"
  | "divider";

// Element configuration for the builder
export interface FormElement {
  id: string;
  type: FormElementType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: Record<string, unknown>;
  position: number;
}

// Page in the form builder
export interface FormPage {
  id: string;
  title: string;
  position: number;
  elements: FormElement[];
}

// Complete form config
export interface FormConfig {
  id: string;
  taskId: string;
  pages: FormPage[];
}

// Element palette item
export interface PaletteItem {
  type: FormElementType;
  label: string;
  icon: string;
  category: "input" | "selection" | "display" | "contact";
}

// Palette items grouped by category
export const PALETTE_ITEMS: PaletteItem[] = [
  // Input elements
  { type: "text", label: "Text Input", icon: "Type", category: "input" },
  { type: "textarea", label: "Text Area", icon: "AlignLeft", category: "input" },
  { type: "number", label: "Number", icon: "Hash", category: "input" },
  { type: "date", label: "Date", icon: "Calendar", category: "input" },
  { type: "file", label: "File Upload", icon: "Upload", category: "input" },

  // Selection elements
  { type: "select", label: "Dropdown", icon: "ChevronDown", category: "selection" },
  { type: "radio", label: "Radio Buttons", icon: "Circle", category: "selection" },
  { type: "checkbox", label: "Checkboxes", icon: "CheckSquare", category: "selection" },

  // Display elements
  { type: "heading", label: "Heading", icon: "Heading", category: "display" },
  { type: "paragraph", label: "Paragraph", icon: "FileText", category: "display" },
  { type: "image", label: "Image", icon: "Image", category: "display" },
  { type: "divider", label: "Divider", icon: "Minus", category: "display" },

  // Contact elements
  { type: "email", label: "Email", icon: "Mail", category: "contact" },
  { type: "phone", label: "Phone", icon: "Phone", category: "contact" },
];

// Default element configuration by type
export function getDefaultElement(type: FormElementType, id: string, position: number): FormElement {
  const defaults: Record<FormElementType, Partial<FormElement>> = {
    text: { label: "Text Field", placeholder: "Enter text..." },
    textarea: { label: "Text Area", placeholder: "Enter text..." },
    select: { label: "Dropdown", options: [{ label: "Option 1", value: "option1" }] },
    radio: { label: "Radio Group", options: [{ label: "Option 1", value: "option1" }] },
    checkbox: { label: "Checkbox Group", options: [{ label: "Option 1", value: "option1" }] },
    file: { label: "File Upload", helpText: "Drag and drop or click to upload" },
    date: { label: "Date", placeholder: "Select a date" },
    number: { label: "Number", placeholder: "Enter a number" },
    email: { label: "Email", placeholder: "Enter email address" },
    phone: { label: "Phone", placeholder: "Enter phone number" },
    heading: { label: "Section Heading" },
    paragraph: { label: "Enter paragraph text here..." },
    image: { label: "Image" },
    divider: { label: "" },
  };

  return {
    id,
    type,
    position,
    ...defaults[type],
    label: defaults[type]?.label ?? type,
  };
}
