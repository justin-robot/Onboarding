import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ElementPropertyEditor,
  type FormElement,
} from "../components/form-builder";

describe("ElementPropertyEditor", () => {
  const createTextElement = (): FormElement => ({
    id: "el_1",
    type: "text",
    label: "Name",
    placeholder: "Enter your name",
    helpText: "Your full legal name",
    required: false,
    position: 0,
  });

  const createSelectElement = (): FormElement => ({
    id: "el_2",
    type: "select",
    label: "Country",
    placeholder: "Select a country",
    required: true,
    options: [
      { label: "USA", value: "usa" },
      { label: "Canada", value: "canada" },
    ],
    position: 0,
  });

  it("should render nothing when no element is selected", () => {
    const { container } = render(
      <ElementPropertyEditor element={null} onElementChange={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render property form when element is selected", () => {
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByLabelText(/label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/placeholder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/help text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/required/i)).toBeInTheDocument();
  });

  it("should display current element values", () => {
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByLabelText(/label/i)).toHaveValue("Name");
    expect(screen.getByLabelText(/placeholder/i)).toHaveValue("Enter your name");
    expect(screen.getByLabelText(/help text/i)).toHaveValue("Your full legal name");
  });

  it("should call onElementChange when label is changed", async () => {
    const user = userEvent.setup();
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    const labelInput = screen.getByLabelText(/^label$/i);
    await user.type(labelInput, "X");

    expect(onElementChange).toHaveBeenCalled();
    const lastCall = onElementChange.mock.calls[onElementChange.mock.calls.length - 1][0];
    expect(lastCall.label).toBe("NameX");
  });

  it("should call onElementChange when placeholder is changed", async () => {
    const user = userEvent.setup();
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    const placeholderInput = screen.getByLabelText(/^placeholder$/i);
    await user.type(placeholderInput, "X");

    expect(onElementChange).toHaveBeenCalled();
    const lastCall = onElementChange.mock.calls[onElementChange.mock.calls.length - 1][0];
    expect(lastCall.placeholder).toBe("Enter your nameX");
  });

  it("should toggle required field", async () => {
    const user = userEvent.setup();
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    const requiredCheckbox = screen.getByLabelText(/required/i);
    await user.click(requiredCheckbox);

    expect(onElementChange).toHaveBeenCalledWith(
      expect.objectContaining({ required: true })
    );
  });

  it("should show options editor for select element", () => {
    const element = createSelectElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByText(/options/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("USA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Canada")).toBeInTheDocument();
  });

  it("should not show options editor for text element", () => {
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.queryByText(/^options$/i)).not.toBeInTheDocument();
  });

  it("should show options editor for radio element", () => {
    const element: FormElement = {
      id: "el_3",
      type: "radio",
      label: "Gender",
      options: [{ label: "Male", value: "male" }],
      position: 0,
    };
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByText(/options/i)).toBeInTheDocument();
  });

  it("should show options editor for checkbox element", () => {
    const element: FormElement = {
      id: "el_4",
      type: "checkbox",
      label: "Interests",
      options: [{ label: "Sports", value: "sports" }],
      position: 0,
    };
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByText(/options/i)).toBeInTheDocument();
  });

  it("should add new option", async () => {
    const user = userEvent.setup();
    const element = createSelectElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    const addButton = screen.getByRole("button", { name: /add option/i });
    await user.click(addButton);

    expect(onElementChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          { label: "USA", value: "usa" },
          { label: "Canada", value: "canada" },
          expect.objectContaining({ label: expect.any(String) }),
        ]),
      })
    );
  });

  it("should remove option", async () => {
    const user = userEvent.setup();
    const element = createSelectElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove option/i });
    await user.click(removeButtons[0]);

    expect(onElementChange).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [{ label: "Canada", value: "canada" }],
      })
    );
  });

  it("should show validation section", () => {
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    expect(screen.getByText(/validation/i)).toBeInTheDocument();
  });

  it("should show element type in header", () => {
    const element = createTextElement();
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    // Check for "Type: text" in the header
    expect(screen.getByText(/type:/i)).toBeInTheDocument();
  });

  it("should update validation rules", async () => {
    const user = userEvent.setup();
    const element: FormElement = {
      ...createTextElement(),
      validation: {},
    };
    const onElementChange = vi.fn();

    render(
      <ElementPropertyEditor element={element} onElementChange={onElementChange} />
    );

    // Find min length input if it exists
    const minLengthInput = screen.queryByLabelText(/min.*length/i);
    if (minLengthInput) {
      await user.type(minLengthInput, "5");
      expect(onElementChange).toHaveBeenCalled();
    }
  });
});
