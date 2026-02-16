import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionDetails } from "../components/moxo-layout/action-details";

describe("ActionDetails", () => {
  const defaultProps = {
    title: "Test Task",
    type: "form" as const,
  };

  describe("rendering", () => {
    it("should render task title", () => {
      render(<ActionDetails {...defaultProps} />);
      expect(screen.getByText("Test Task")).toBeInTheDocument();
    });

    it("should render section title when provided", () => {
      render(<ActionDetails {...defaultProps} sectionTitle="Getting Started" />);
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      render(<ActionDetails {...defaultProps} description="This is a task description" />);
      expect(screen.getByText("This is a task description")).toBeInTheDocument();
    });

    it("should render due date when provided", () => {
      render(<ActionDetails {...defaultProps} dueDate="2024-12-25" />);
      expect(screen.getByText("Due Date")).toBeInTheDocument();
      expect(screen.getByText(/Dec/)).toBeInTheDocument();
    });

    it("should render assignees when provided", () => {
      render(
        <ActionDetails
          {...defaultProps}
          assignees={[
            { id: "1", name: "John Doe" },
            { id: "2", name: "Jane Smith" },
          ]}
        />
      );
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  describe("type-specific icons", () => {
    it("should render form type", () => {
      render(<ActionDetails {...defaultProps} type="form" />);
      // Type icons are SVGs rendered by lucide
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("should render acknowledgement type", () => {
      render(<ActionDetails {...defaultProps} type="acknowledgement" />);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("should render file_upload type", () => {
      render(<ActionDetails {...defaultProps} type="file_upload" />);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("should render approval type", () => {
      render(<ActionDetails {...defaultProps} type="approval" />);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("should render booking type", () => {
      render(<ActionDetails {...defaultProps} type="booking" />);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });

    it("should render esign type", () => {
      render(<ActionDetails {...defaultProps} type="esign" />);
      expect(document.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("should show 'Your Turn' badge when isYourTurn is true", () => {
      render(<ActionDetails {...defaultProps} isYourTurn />);
      expect(screen.getByText("Your Turn")).toBeInTheDocument();
    });

    it("should not show 'Your Turn' badge when task is completed", () => {
      render(<ActionDetails {...defaultProps} isYourTurn isCompleted />);
      expect(screen.queryByText("Your Turn")).not.toBeInTheDocument();
    });

    it("should show 'Complete' badge when isCompleted is true", () => {
      render(<ActionDetails {...defaultProps} isCompleted />);
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });
  });

  describe("tabs", () => {
    it("should render Details and Activity tabs", () => {
      render(<ActionDetails {...defaultProps} />);
      expect(screen.getByRole("tab", { name: /details/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /activity/i })).toBeInTheDocument();
    });

    it("should show activity count in tab", () => {
      const activityEntries = [
        { id: "1", eventType: "task.created", actorId: "user1", createdAt: new Date() },
        { id: "2", eventType: "task.updated", actorId: "user1", createdAt: new Date() },
      ];

      render(<ActionDetails {...defaultProps} activityEntries={activityEntries} />);
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  describe("progress tracker", () => {
    it("should render progress tracker when progress is provided", () => {
      render(
        <ActionDetails
          {...defaultProps}
          progress={{ completedSteps: 2, totalSteps: 5 }}
        />
      );
      // "Progress" appears in both the section header and the ProgressTracker
      expect(screen.getAllByText("Progress").length).toBeGreaterThan(0);
      expect(screen.getByText("2 of 5 steps")).toBeInTheDocument();
    });

    it("should not render progress tracker when progress is not provided", () => {
      render(<ActionDetails {...defaultProps} />);
      // Progress label from ProgressTracker should not exist
      expect(screen.queryByText("2 of 5 steps")).not.toBeInTheDocument();
    });
  });

  describe("attachments", () => {
    it("should render attachments when provided", () => {
      const attachments = [
        { id: "1", name: "document.pdf", type: "application/pdf", size: 1024 },
        { id: "2", name: "image.png", type: "image/png", size: 2048 },
      ];

      render(<ActionDetails {...defaultProps} attachments={attachments} />);
      expect(screen.getByText("Attachments (2)")).toBeInTheDocument();
      expect(screen.getByText("document.pdf")).toBeInTheDocument();
      expect(screen.getByText("image.png")).toBeInTheDocument();
    });

    it("should format file sizes correctly", () => {
      const attachments = [
        { id: "1", name: "small.txt", type: "text/plain", size: 500 },
        { id: "2", name: "medium.pdf", type: "application/pdf", size: 1500 },
        { id: "3", name: "large.zip", type: "application/zip", size: 1500000 },
      ];

      render(<ActionDetails {...defaultProps} attachments={attachments} />);
      expect(screen.getByText(/500 B/)).toBeInTheDocument();
      expect(screen.getByText(/1\.5 KB/)).toBeInTheDocument();
      expect(screen.getByText(/1\.4 MB/)).toBeInTheDocument();
    });

    it("should render download and external link buttons when URL provided", () => {
      const attachments = [
        { id: "1", name: "file.pdf", type: "application/pdf", url: "https://example.com/file.pdf" },
      ];

      render(<ActionDetails {...defaultProps} attachments={attachments} />);
      const links = screen.getAllByRole("link");
      expect(links.length).toBe(2); // Download and external link
    });
  });

  describe("primary action", () => {
    it("should render primary action button when onPrimaryAction provided", () => {
      const onPrimaryAction = vi.fn();
      render(<ActionDetails {...defaultProps} onPrimaryAction={onPrimaryAction} />);
      expect(screen.getByRole("button", { name: "Fill Form" })).toBeInTheDocument();
    });

    it("should use custom label when primaryActionLabel provided", () => {
      render(
        <ActionDetails
          {...defaultProps}
          onPrimaryAction={() => {}}
          primaryActionLabel="Submit Now"
        />
      );
      expect(screen.getByRole("button", { name: "Submit Now" })).toBeInTheDocument();
    });

    it("should call onPrimaryAction when clicked", () => {
      const onPrimaryAction = vi.fn();
      render(<ActionDetails {...defaultProps} onPrimaryAction={onPrimaryAction} />);

      fireEvent.click(screen.getByRole("button", { name: "Fill Form" }));
      expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    });

    it("should not render primary action when task is completed", () => {
      render(
        <ActionDetails {...defaultProps} isCompleted onPrimaryAction={() => {}} />
      );
      expect(screen.queryByRole("button", { name: "Fill Form" })).not.toBeInTheDocument();
    });

    it("should disable button when isLoading is true", () => {
      render(
        <ActionDetails {...defaultProps} onPrimaryAction={() => {}} isLoading />
      );
      expect(screen.getByRole("button", { name: "Fill Form" })).toBeDisabled();
    });

    it("should use type-specific default action labels", () => {
      const types = [
        { type: "form" as const, label: "Fill Form" },
        { type: "acknowledgement" as const, label: "Acknowledge" },
        { type: "file_upload" as const, label: "Upload File" },
        { type: "approval" as const, label: "Review" },
        { type: "booking" as const, label: "Schedule" },
        { type: "esign" as const, label: "Sign Document" },
      ];

      types.forEach(({ type, label }) => {
        const { unmount } = render(
          <ActionDetails title="Test" type={type} onPrimaryAction={() => {}} />
        );
        expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("close button", () => {
    it("should render close button when onClose provided", () => {
      render(<ActionDetails {...defaultProps} onClose={() => {}} />);
      // X icon button
      const closeButton = screen.getByRole("button", { name: "" });
      expect(closeButton).toBeInTheDocument();
    });

    it("should call onClose when close button clicked", () => {
      const onClose = vi.fn();
      render(<ActionDetails {...defaultProps} onClose={onClose} />);

      // Find button with X icon (the close button has no text name)
      const buttons = screen.getAllByRole("button");
      const closeButton = buttons.find(btn => btn.querySelector(".lucide-x"));
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <ActionDetails {...defaultProps} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
