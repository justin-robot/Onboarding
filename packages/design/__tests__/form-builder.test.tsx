import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormBuilder,
  FormCanvas,
  ElementPalette,
  PageTabs,
  createEmptyFormConfig,
  type FormConfig,
  type FormElement,
  type FormPage,
  PALETTE_ITEMS,
  getDefaultElement,
} from "../components/form-builder";

describe("FormBuilder", () => {
  const createTestConfig = (): FormConfig => ({
    id: "form_1",
    taskId: "task_1",
    pages: [
      {
        id: "page_1",
        title: "Page 1",
        position: 0,
        elements: [],
      },
    ],
  });

  it("should render page tabs", () => {
    const config = createTestConfig();
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("should render element palette", () => {
    const config = createTestConfig();
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    expect(screen.getByText("Elements")).toBeInTheDocument();
    expect(screen.getByText("Text Input")).toBeInTheDocument();
  });

  it("should render empty canvas message when no elements", () => {
    const config = createTestConfig();
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    expect(
      screen.getByText("Drag elements here to build your form")
    ).toBeInTheDocument();
  });

  it("should add element when palette item is clicked", () => {
    const config = createTestConfig();
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    fireEvent.click(screen.getByText("Text Input"));

    expect(onConfigChange).toHaveBeenCalled();
    const newConfig = onConfigChange.mock.calls[0][0] as FormConfig;
    expect(newConfig.pages[0].elements).toHaveLength(1);
    expect(newConfig.pages[0].elements[0].type).toBe("text");
  });

  it("should add new page when add page button is clicked", () => {
    const config = createTestConfig();
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    fireEvent.click(screen.getByLabelText("Add page"));

    expect(onConfigChange).toHaveBeenCalled();
    const newConfig = onConfigChange.mock.calls[0][0] as FormConfig;
    expect(newConfig.pages).toHaveLength(2);
    expect(newConfig.pages[1].title).toBe("Page 2");
  });

  it("should switch pages when page tab is clicked", () => {
    const config: FormConfig = {
      id: "form_1",
      taskId: "task_1",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          position: 0,
          elements: [
            { id: "el_1", type: "text", label: "Field 1", position: 0 },
          ],
        },
        {
          id: "page_2",
          title: "Page 2",
          position: 1,
          elements: [
            { id: "el_2", type: "email", label: "Field 2", position: 0 },
          ],
        },
      ],
    };
    const onConfigChange = vi.fn();

    render(<FormBuilder config={config} onConfigChange={onConfigChange} />);

    // Initially shows Page 1 content
    expect(screen.getByText("Field 1")).toBeInTheDocument();

    // Click Page 2 tab
    fireEvent.click(screen.getByText("Page 2"));

    // Now shows Page 2 content
    expect(screen.getByText("Field 2")).toBeInTheDocument();
  });
});

describe("ElementPalette", () => {
  it("should render all palette categories", () => {
    const onAddElement = vi.fn();

    render(<ElementPalette onAddElement={onAddElement} />);

    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("Display")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("should render all palette items", () => {
    const onAddElement = vi.fn();

    render(<ElementPalette onAddElement={onAddElement} />);

    expect(screen.getByText("Text Input")).toBeInTheDocument();
    expect(screen.getByText("Text Area")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("File Upload")).toBeInTheDocument();
    expect(screen.getByText("Dropdown")).toBeInTheDocument();
    expect(screen.getByText("Radio Buttons")).toBeInTheDocument();
    expect(screen.getByText("Checkboxes")).toBeInTheDocument();
    expect(screen.getByText("Heading")).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("Divider")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
  });

  it("should call onAddElement with correct type when item is clicked", () => {
    const onAddElement = vi.fn();

    render(<ElementPalette onAddElement={onAddElement} />);

    fireEvent.click(screen.getByText("Email"));
    expect(onAddElement).toHaveBeenCalledWith("email");

    fireEvent.click(screen.getByText("Dropdown"));
    expect(onAddElement).toHaveBeenCalledWith("select");
  });

  it("should have draggable items", () => {
    const onAddElement = vi.fn();

    render(<ElementPalette onAddElement={onAddElement} />);

    const textInputButton = screen.getByText("Text Input").closest("button");
    expect(textInputButton).toHaveAttribute("draggable", "true");
  });
});

describe("FormCanvas", () => {
  const createTestElements = (): FormElement[] => [
    { id: "el_1", type: "text", label: "Name", position: 0, required: true },
    { id: "el_2", type: "email", label: "Email", position: 1 },
  ];

  it("should render empty state when no elements", () => {
    const onElementsChange = vi.fn();
    const onSelectElement = vi.fn();
    const onAddElement = vi.fn();

    render(
      <FormCanvas
        elements={[]}
        onElementsChange={onElementsChange}
        selectedElementId={null}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
      />
    );

    expect(
      screen.getByText("Drag elements here to build your form")
    ).toBeInTheDocument();
  });

  it("should render all elements", () => {
    const elements = createTestElements();
    const onElementsChange = vi.fn();
    const onSelectElement = vi.fn();
    const onAddElement = vi.fn();

    render(
      <FormCanvas
        elements={elements}
        onElementsChange={onElementsChange}
        selectedElementId={null}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
      />
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("should show required indicator for required elements", () => {
    const elements = createTestElements();
    const onElementsChange = vi.fn();
    const onSelectElement = vi.fn();
    const onAddElement = vi.fn();

    render(
      <FormCanvas
        elements={elements}
        onElementsChange={onElementsChange}
        selectedElementId={null}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
      />
    );

    // The Name field is required and should show * indicator
    const nameElement = screen.getByText("Name").closest("div")?.parentElement;
    expect(nameElement?.textContent).toContain("*");
  });

  it("should call onSelectElement when element is clicked", () => {
    const elements = createTestElements();
    const onElementsChange = vi.fn();
    const onSelectElement = vi.fn();
    const onAddElement = vi.fn();

    render(
      <FormCanvas
        elements={elements}
        onElementsChange={onElementsChange}
        selectedElementId={null}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
      />
    );

    fireEvent.click(screen.getByText("Name"));
    expect(onSelectElement).toHaveBeenCalledWith("el_1");
  });

  it("should delete element when delete button is clicked", () => {
    const elements = createTestElements();
    const onElementsChange = vi.fn();
    const onSelectElement = vi.fn();
    const onAddElement = vi.fn();

    render(
      <FormCanvas
        elements={elements}
        onElementsChange={onElementsChange}
        selectedElementId={null}
        onSelectElement={onSelectElement}
        onAddElement={onAddElement}
      />
    );

    const deleteButtons = screen.getAllByLabelText("Delete element");
    fireEvent.click(deleteButtons[0]);

    expect(onElementsChange).toHaveBeenCalled();
    const newElements = onElementsChange.mock.calls[0][0] as FormElement[];
    expect(newElements).toHaveLength(1);
    expect(newElements[0].id).toBe("el_2");
  });
});

describe("PageTabs", () => {
  const createTestPages = (): FormPage[] => [
    { id: "page_1", title: "Page 1", position: 0, elements: [] },
    { id: "page_2", title: "Page 2", position: 1, elements: [] },
  ];

  it("should render all page tabs", () => {
    const pages = createTestPages();

    render(
      <PageTabs
        pages={pages}
        activePageId="page_1"
        onPageChange={vi.fn()}
        onAddPage={vi.fn()}
        onDeletePage={vi.fn()}
        onRenamePage={vi.fn()}
      />
    );

    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
  });

  it("should call onPageChange when tab is clicked", () => {
    const pages = createTestPages();
    const onPageChange = vi.fn();

    render(
      <PageTabs
        pages={pages}
        activePageId="page_1"
        onPageChange={onPageChange}
        onAddPage={vi.fn()}
        onDeletePage={vi.fn()}
        onRenamePage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Page 2"));
    expect(onPageChange).toHaveBeenCalledWith("page_2");
  });

  it("should call onAddPage when add button is clicked", () => {
    const pages = createTestPages();
    const onAddPage = vi.fn();

    render(
      <PageTabs
        pages={pages}
        activePageId="page_1"
        onPageChange={vi.fn()}
        onAddPage={onAddPage}
        onDeletePage={vi.fn()}
        onRenamePage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText("Add page"));
    expect(onAddPage).toHaveBeenCalled();
  });

  it("should show delete button only when more than one page", () => {
    const singlePage: FormPage[] = [
      { id: "page_1", title: "Page 1", position: 0, elements: [] },
    ];

    const { rerender } = render(
      <PageTabs
        pages={singlePage}
        activePageId="page_1"
        onPageChange={vi.fn()}
        onAddPage={vi.fn()}
        onDeletePage={vi.fn()}
        onRenamePage={vi.fn()}
      />
    );

    // With single page, no delete button
    expect(screen.queryByLabelText(/Delete Page/)).not.toBeInTheDocument();

    // With multiple pages, delete buttons should appear on hover
    const multiplePages = createTestPages();
    rerender(
      <PageTabs
        pages={multiplePages}
        activePageId="page_1"
        onPageChange={vi.fn()}
        onAddPage={vi.fn()}
        onDeletePage={vi.fn()}
        onRenamePage={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Delete Page 1")).toBeInTheDocument();
  });
});

describe("createEmptyFormConfig", () => {
  it("should create config with correct taskId", () => {
    const config = createEmptyFormConfig("task_123");
    expect(config.taskId).toBe("task_123");
  });

  it("should create config with one empty page", () => {
    const config = createEmptyFormConfig("task_123");
    expect(config.pages).toHaveLength(1);
    expect(config.pages[0].title).toBe("Page 1");
    expect(config.pages[0].elements).toHaveLength(0);
  });

  it("should generate unique ids", () => {
    const config1 = createEmptyFormConfig("task_1");
    const config2 = createEmptyFormConfig("task_2");
    expect(config1.id).not.toBe(config2.id);
    expect(config1.pages[0].id).not.toBe(config2.pages[0].id);
  });
});

describe("getDefaultElement", () => {
  it("should create text element with default label", () => {
    const element = getDefaultElement("text", "el_1", 0);
    expect(element.type).toBe("text");
    expect(element.label).toBe("Text Field");
    expect(element.placeholder).toBe("Enter text...");
  });

  it("should create select element with default option", () => {
    const element = getDefaultElement("select", "el_1", 0);
    expect(element.type).toBe("select");
    expect(element.options).toHaveLength(1);
    expect(element.options?.[0].label).toBe("Option 1");
  });

  it("should set correct position", () => {
    const element = getDefaultElement("text", "el_1", 5);
    expect(element.position).toBe(5);
  });

  it("should set correct id", () => {
    const element = getDefaultElement("text", "custom_id", 0);
    expect(element.id).toBe("custom_id");
  });
});

describe("PALETTE_ITEMS", () => {
  it("should have 14 element types", () => {
    expect(PALETTE_ITEMS).toHaveLength(14);
  });

  it("should have correct categories", () => {
    const inputItems = PALETTE_ITEMS.filter((i) => i.category === "input");
    const selectionItems = PALETTE_ITEMS.filter(
      (i) => i.category === "selection"
    );
    const displayItems = PALETTE_ITEMS.filter((i) => i.category === "display");
    const contactItems = PALETTE_ITEMS.filter((i) => i.category === "contact");

    expect(inputItems).toHaveLength(5);
    expect(selectionItems).toHaveLength(3);
    expect(displayItems).toHaveLength(4);
    expect(contactItems).toHaveLength(2);
  });
});
