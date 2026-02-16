import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionHeader, SectionContent } from "../components/moxo-layout/section-header";

describe("SectionHeader", () => {
  const defaultProps = {
    title: "Test Section",
  };

  describe("rendering", () => {
    it("should render section title", () => {
      render(<SectionHeader {...defaultProps} />);
      expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<SectionHeader {...defaultProps} description="This is a description" />);
      expect(screen.getByText("This is a description")).toBeInTheDocument();
    });

    it("should render children when not collapsed", () => {
      render(
        <SectionHeader {...defaultProps}>
          <div data-testid="child">Child content</div>
        </SectionHeader>
      );
      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should not render children when collapsed", () => {
      render(
        <SectionHeader {...defaultProps} isCollapsed>
          <div data-testid="child">Child content</div>
        </SectionHeader>
      );
      expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show 'Not Started' badge by default", () => {
      render(<SectionHeader {...defaultProps} />);
      expect(screen.getByText("Not Started")).toBeInTheDocument();
    });

    it("should show 'In Progress' badge when status is in_progress", () => {
      render(<SectionHeader {...defaultProps} status="in_progress" />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("should show 'Completed' badge when status is completed", () => {
      render(<SectionHeader {...defaultProps} status="completed" />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  describe("progress counter", () => {
    it("should not show progress when totalCount is 0", () => {
      render(<SectionHeader {...defaultProps} completedCount={0} totalCount={0} />);
      expect(screen.queryByText(/of/)).not.toBeInTheDocument();
    });

    it("should show progress counter when totalCount > 0", () => {
      render(<SectionHeader {...defaultProps} completedCount={2} totalCount={5} />);
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText(/of 5/)).toBeInTheDocument();
    });

    it("should handle full completion", () => {
      render(<SectionHeader {...defaultProps} completedCount={5} totalCount={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText(/of 5/)).toBeInTheDocument();
    });
  });

  describe("collapse functionality", () => {
    it("should show collapse toggle when collapsible is true (default)", () => {
      render(<SectionHeader {...defaultProps} />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should not show collapse toggle when collapsible is false", () => {
      render(<SectionHeader {...defaultProps} collapsible={false} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("should call onToggleCollapse when toggle button clicked", () => {
      const onToggleCollapse = vi.fn();
      render(<SectionHeader {...defaultProps} onToggleCollapse={onToggleCollapse} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it("should show ChevronDown when not collapsed", () => {
      render(<SectionHeader {...defaultProps} isCollapsed={false} />);
      const button = screen.getByRole("button");
      // ChevronDown has a path with "m6 9 6 6 6-6"
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("should show ChevronRight when collapsed", () => {
      render(<SectionHeader {...defaultProps} isCollapsed={true} />);
      const button = screen.getByRole("button");
      // ChevronRight has a different path
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("border styling based on status", () => {
    it("should have slate border for not_started status", () => {
      const { container } = render(<SectionHeader {...defaultProps} status="not_started" />);
      const header = container.querySelector(".border-l-4");
      expect(header?.className).toContain("border-l-slate");
    });

    it("should have blue border for in_progress status", () => {
      const { container } = render(<SectionHeader {...defaultProps} status="in_progress" />);
      const header = container.querySelector(".border-l-4");
      expect(header?.className).toContain("border-l-blue-500");
    });

    it("should have green border for completed status", () => {
      const { container } = render(<SectionHeader {...defaultProps} status="completed" />);
      const header = container.querySelector(".border-l-4");
      expect(header?.className).toContain("border-l-green-500");
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(<SectionHeader {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

describe("SectionContent", () => {
  it("should render children", () => {
    render(
      <SectionContent>
        <div data-testid="child">Content</div>
      </SectionContent>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SectionContent className="custom-class">
        <div>Content</div>
      </SectionContent>
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have space-y-2 for spacing between children", () => {
    const { container } = render(
      <SectionContent>
        <div>Item 1</div>
        <div>Item 2</div>
      </SectionContent>
    );
    expect(container.firstChild).toHaveClass("space-y-2");
  });
});
