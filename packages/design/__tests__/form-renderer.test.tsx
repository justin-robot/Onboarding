import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormRenderer, type FormElement } from "../components/form-builder";

describe("FormRenderer", () => {
  const createTextElement = (): FormElement => ({
    id: "el_1",
    type: "text",
    label: "Name",
    placeholder: "Enter your name",
    helpText: "Your full legal name",
    required: true,
    position: 0,
  });

  it("should render text input element", () => {
    const elements: FormElement[] = [createTextElement()];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Your full legal name")).toBeInTheDocument();
  });

  it("should render textarea element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "textarea",
        label: "Description",
        placeholder: "Enter description",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText(/description/i);
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
  });

  it("should render number input element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "number",
        label: "Age",
        placeholder: "Enter age",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/age/i);
    expect(input).toHaveAttribute("type", "number");
  });

  it("should render date input element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "date",
        label: "Birth Date",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/birth date/i);
    expect(input).toHaveAttribute("type", "date");
  });

  it("should render email input element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "email",
        label: "Email",
        placeholder: "Enter email",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("type", "email");
  });

  it("should render phone input element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "phone",
        label: "Phone",
        placeholder: "Enter phone",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/phone/i);
    expect(input).toHaveAttribute("type", "tel");
  });

  it("should render select/dropdown element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "select",
        label: "Country",
        options: [
          { label: "USA", value: "usa" },
          { label: "Canada", value: "canada" },
        ],
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText(/country/i)).toBeInTheDocument();
    // Select trigger should be present
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render radio group element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "radio",
        label: "Gender",
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText(/gender/i)).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("should render checkbox group element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "checkbox",
        label: "Interests",
        options: [
          { label: "Sports", value: "sports" },
          { label: "Music", value: "music" },
        ],
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText(/interests/i)).toBeInTheDocument();
    expect(screen.getByText("Sports")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("should render heading element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "heading",
        label: "Section Title",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText("Section Title")).toBeInTheDocument();
  });

  it("should render paragraph element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "paragraph",
        label: "This is a paragraph of text.",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText("This is a paragraph of text.")).toBeInTheDocument();
  });

  it("should render divider element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "divider",
        label: "",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    const { container } = render(
      <FormRenderer elements={elements} onSubmit={onSubmit} />
    );

    expect(container.querySelector("[data-slot='separator']")).toBeInTheDocument();
  });

  it("should render file upload element", () => {
    const elements: FormElement[] = [
      {
        id: "el_1",
        type: "file",
        label: "Upload Document",
        helpText: "PDF or DOC files only",
        position: 0,
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    expect(screen.getByText(/upload document/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/upload document/i);
    expect(input).toHaveAttribute("type", "file");
  });

  it("should show required indicator for required fields", () => {
    const elements: FormElement[] = [createTextElement()];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    // Required fields should have asterisk
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("should call onSubmit with form values", async () => {
    const user = userEvent.setup();
    const elements: FormElement[] = [createTextElement()];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/name/i);
    await user.type(input, "John Doe");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // react-hook-form calls with (data, event), so we check first arg
    expect(onSubmit).toHaveBeenCalled();
    const firstCallArgs = onSubmit.mock.calls[0];
    // First argument should be the form data
    expect(firstCallArgs[0]).toEqual(
      expect.objectContaining({
        el_1: "John Doe",
      })
    );
  });

  it("should apply minLength validation", async () => {
    const user = userEvent.setup();
    const elements: FormElement[] = [
      {
        ...createTextElement(),
        validation: { minLength: 5 },
      },
    ];
    const onSubmit = vi.fn();

    render(<FormRenderer elements={elements} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(/name/i);
    await user.type(input, "Jo");

    const submitButton = screen.getByRole("button", { name: /submit/i });
    await user.click(submitButton);

    // Should not submit because validation fails
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should render multiple elements in order", () => {
    const elements: FormElement[] = [
      { id: "el_1", type: "heading", label: "Personal Info", position: 0 },
      { id: "el_2", type: "text", label: "First Name", position: 1 },
      { id: "el_3", type: "text", label: "Last Name", position: 2 },
    ];
    const onSubmit = vi.fn();

    const { container } = render(
      <FormRenderer elements={elements} onSubmit={onSubmit} />
    );

    const allText = container.textContent;
    const headingIndex = allText?.indexOf("Personal Info") ?? -1;
    const firstNameIndex = allText?.indexOf("First Name") ?? -1;
    const lastNameIndex = allText?.indexOf("Last Name") ?? -1;

    expect(headingIndex).toBeLessThan(firstNameIndex);
    expect(firstNameIndex).toBeLessThan(lastNameIndex);
  });

  it("should support custom submit button text", () => {
    const elements: FormElement[] = [createTextElement()];
    const onSubmit = vi.fn();

    render(
      <FormRenderer
        elements={elements}
        onSubmit={onSubmit}
        submitButtonText="Send"
      />
    );

    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("should support hiding submit button", () => {
    const elements: FormElement[] = [createTextElement()];
    const onSubmit = vi.fn();

    render(
      <FormRenderer
        elements={elements}
        onSubmit={onSubmit}
        showSubmitButton={false}
      />
    );

    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});
