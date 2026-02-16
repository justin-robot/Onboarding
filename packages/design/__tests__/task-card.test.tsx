import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskCard } from "../components/moxo-layout/task-card";

describe("TaskCard", () => {
  const defaultProps = {
    id: "task-1",
    title: "Test Task",
    type: "form" as const,
  };

  describe("rendering", () => {
    it("should render task title", () => {
      render(<TaskCard {...defaultProps} />);
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    it("should render position number when provided", () => {
      render(<TaskCard {...defaultProps} position={3} />);
      expect(screen.getByText("3.")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<TaskCard {...defaultProps} description="This is a description" />);
      expect(screen.getByText("This is a description")).toBeInTheDocument();
    });

    it("should render due date when provided", () => {
      const dueDate = new Date("2024-12-25");
      render(<TaskCard {...defaultProps} dueDate={dueDate} />);
      expect(screen.getByText(/Due/)).toBeInTheDocument();
    });

    it("should render single assignee name", () => {
      render(<TaskCard {...defaultProps} assignees={["John Doe"]} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render assignee count for multiple assignees", () => {
      render(<TaskCard {...defaultProps} assignees={["John", "Jane", "Bob"]} />);
      expect(screen.getByText("3 assignees")).toBeInTheDocument();
    });
  });

  describe("type-specific styling", () => {
    it("should render form type with teal styling", () => {
      render(<TaskCard {...defaultProps} type="form" />);
      expect(screen.getByText("Form")).toBeInTheDocument();
    });

    it("should render acknowledgement type", () => {
      render(<TaskCard {...defaultProps} type="acknowledgement" />);
      expect(screen.getByText("Acknowledgement")).toBeInTheDocument();
    });

    it("should render file_upload type", () => {
      render(<TaskCard {...defaultProps} type="file_upload" />);
      expect(screen.getByText("File Upload")).toBeInTheDocument();
    });

    it("should render approval type", () => {
      render(<TaskCard {...defaultProps} type="approval" />);
      expect(screen.getByText("Approval")).toBeInTheDocument();
    });

    it("should render booking type", () => {
      render(<TaskCard {...defaultProps} type="booking" />);
      expect(screen.getByText("Booking")).toBeInTheDocument();
    });

    it("should render esign type", () => {
      render(<TaskCard {...defaultProps} type="esign" />);
      expect(screen.getByText("E-Signature")).toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show 'Your Turn' badge when isYourTurn is true", () => {
      render(<TaskCard {...defaultProps} isYourTurn />);
      expect(screen.getByText("Your Turn")).toBeInTheDocument();
    });

    it("should not show 'Your Turn' badge when task is completed", () => {
      render(<TaskCard {...defaultProps} isYourTurn isCompleted />);
      expect(screen.queryByText("Your Turn")).not.toBeInTheDocument();
    });

    it("should show 'Complete' badge when isCompleted is true", () => {
      render(<TaskCard {...defaultProps} isCompleted />);
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    it("should show 'Locked' badge when isLocked is true", () => {
      render(<TaskCard {...defaultProps} isLocked />);
      expect(screen.getByText("Locked")).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onClick when clicked", () => {
      const onClick = vi.fn();
      render(<TaskCard {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should be disabled when locked", () => {
      const onClick = vi.fn();
      render(<TaskCard {...defaultProps} isLocked onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("should not call onClick when locked", () => {
      const onClick = vi.fn();
      render(<TaskCard {...defaultProps} isLocked onClick={onClick} />);

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("visual states", () => {
    it("should apply selected styling when isSelected is true", () => {
      render(<TaskCard {...defaultProps} isSelected />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("border-blue-500");
    });

    it("should apply completed styling when isCompleted is true", () => {
      render(<TaskCard {...defaultProps} isCompleted />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("border-green-200");
    });

    it("should apply locked styling when isLocked is true", () => {
      render(<TaskCard {...defaultProps} isLocked />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("opacity-50");
    });

    it("should strike through title when completed", () => {
      render(<TaskCard {...defaultProps} isCompleted />);
      const title = screen.getByText("Test Task");
      expect(title.className).toContain("line-through");
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      render(<TaskCard {...defaultProps} className="custom-class" />);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
    });
  });
});
