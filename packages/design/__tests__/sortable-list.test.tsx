import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SortableList, SortableItemWrapper, arrayMove, type SortableItem } from "../components/ui/sortable-list";

// Test items extending SortableItem
interface TestItem extends SortableItem {
  name: string;
}

const testItems: TestItem[] = [
  { id: "1", name: "Item 1" },
  { id: "2", name: "Item 2" },
  { id: "3", name: "Item 3" },
];

describe("SortableList", () => {
  it("should render all items", () => {
    const onReorder = vi.fn();

    render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
      />
    );

    expect(screen.getByTestId("item-1")).toBeInTheDocument();
    expect(screen.getByTestId("item-2")).toBeInTheDocument();
    expect(screen.getByTestId("item-3")).toBeInTheDocument();
  });

  it("should render items in correct order", () => {
    const onReorder = vi.fn();

    render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={(item) => <span>{item.name}</span>}
      />
    );

    const items = screen.getAllByText(/Item \d/);
    expect(items[0]).toHaveTextContent("Item 1");
    expect(items[1]).toHaveTextContent("Item 2");
    expect(items[2]).toHaveTextContent("Item 3");
  });

  it("should apply vertical direction by default", () => {
    const onReorder = vi.fn();

    const { container } = render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={(item) => <div>{item.name}</div>}
      />
    );

    const listContainer = container.firstChild as HTMLElement;
    expect(listContainer).toHaveClass("flex-col");
  });

  it("should apply horizontal direction when specified", () => {
    const onReorder = vi.fn();

    const { container } = render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={(item) => <div>{item.name}</div>}
        direction="horizontal"
      />
    );

    const listContainer = container.firstChild as HTMLElement;
    expect(listContainer).toHaveClass("flex-row");
  });

  it("should apply custom className to container", () => {
    const onReorder = vi.fn();

    const { container } = render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={(item) => <div>{item.name}</div>}
        className="custom-class"
      />
    );

    const listContainer = container.firstChild as HTMLElement;
    expect(listContainer).toHaveClass("custom-class");
  });

  it("should render empty list when no items", () => {
    const onReorder = vi.fn();

    const { container } = render(
      <SortableList<TestItem>
        items={[]}
        onReorder={onReorder}
        renderItem={(item) => <div>{item.name}</div>}
      />
    );

    const listContainer = container.firstChild as HTMLElement;
    expect(listContainer.children).toHaveLength(0);
  });

  it("should pass isDragging flag to renderItem", () => {
    const onReorder = vi.fn();
    const renderItem = vi.fn((item: TestItem, _index: number, isDragging: boolean) => (
      <div data-dragging={isDragging}>{item.name}</div>
    ));

    render(
      <SortableList
        items={testItems}
        onReorder={onReorder}
        renderItem={renderItem}
      />
    );

    // All items should have isDragging=false initially
    expect(renderItem).toHaveBeenCalledWith(testItems[0], 0, false);
    expect(renderItem).toHaveBeenCalledWith(testItems[1], 1, false);
    expect(renderItem).toHaveBeenCalledWith(testItems[2], 2, false);
  });
});

describe("SortableItemWrapper", () => {
  it("should render children", () => {
    render(
      <SortableItemWrapper id="test-id">
        <span>Test Content</span>
      </SortableItemWrapper>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SortableItemWrapper id="test-id" className="custom-item-class">
        <span>Test Content</span>
      </SortableItemWrapper>
    );

    expect(container.firstChild).toHaveClass("custom-item-class");
  });
});

describe("arrayMove", () => {
  it("should move item from old index to new index", () => {
    const items = ["a", "b", "c", "d"];
    const result = arrayMove(items, 0, 2);
    expect(result).toEqual(["b", "c", "a", "d"]);
  });

  it("should handle moving item to end", () => {
    const items = ["a", "b", "c"];
    const result = arrayMove(items, 0, 2);
    expect(result).toEqual(["b", "c", "a"]);
  });

  it("should handle moving item to start", () => {
    const items = ["a", "b", "c"];
    const result = arrayMove(items, 2, 0);
    expect(result).toEqual(["c", "a", "b"]);
  });

  it("should return same order when indices are equal", () => {
    const items = ["a", "b", "c"];
    const result = arrayMove(items, 1, 1);
    expect(result).toEqual(["a", "b", "c"]);
  });
});
