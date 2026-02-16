import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Timeline, ProgressTracker } from "../components/moxo-layout/timeline";

describe("Timeline", () => {
  const defaultSteps = [
    { id: "step-1", number: 1, title: "Step 1", status: "completed" as const },
    { id: "step-2", number: 2, title: "Step 2", status: "current" as const },
    { id: "step-3", number: 3, title: "Step 3", status: "upcoming" as const },
  ];

  describe("rendering", () => {
    it("should render all steps", () => {
      render(<Timeline steps={defaultSteps} />);

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("Step 3")).toBeInTheDocument();
    });

    it("should render step numbers", () => {
      render(<Timeline steps={defaultSteps} />);

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render check icon for completed steps", () => {
      render(<Timeline steps={defaultSteps} />);

      // Completed step should have check icon instead of number
      expect(screen.queryByText("1")).not.toBeInTheDocument();
      // Check icon is an SVG
      const completedButton = screen.getAllByRole("button")[0];
      expect(completedButton.querySelector("svg")).toBeInTheDocument();
    });

    it("should render step description when provided", () => {
      const stepsWithDescription = [
        { id: "step-1", number: 1, title: "Step 1", status: "current" as const, description: "Step description" },
      ];

      render(<Timeline steps={stepsWithDescription} />);
      expect(screen.getByText("Step description")).toBeInTheDocument();
    });
  });

  describe("status styling", () => {
    it("should apply completed styling", () => {
      render(<Timeline steps={[{ id: "1", number: 1, title: "Test", status: "completed" }]} />);

      const button = screen.getAllByRole("button")[0];
      expect(button.className).toContain("bg-green-500");
    });

    it("should apply current styling", () => {
      render(<Timeline steps={[{ id: "1", number: 1, title: "Test", status: "current" }]} />);

      const button = screen.getAllByRole("button")[0];
      expect(button.className).toContain("bg-blue-500");
    });

    it("should apply upcoming styling", () => {
      render(<Timeline steps={[{ id: "1", number: 1, title: "Test", status: "upcoming" }]} />);

      const button = screen.getAllByRole("button")[0];
      expect(button.className).toContain("border-slate-300");
    });

    it("should apply locked styling", () => {
      render(<Timeline steps={[{ id: "1", number: 1, title: "Test", status: "locked" }]} />);

      const button = screen.getAllByRole("button")[0];
      expect(button.className).toContain("bg-slate-100");
    });
  });

  describe("selection", () => {
    it("should apply selection ring to selected step", () => {
      render(<Timeline steps={defaultSteps} selectedStepId="step-2" />);

      const buttons = screen.getAllByRole("button");
      // Find the button for step-2 (index 2 because step 1 has circle + text button)
      const step2Button = buttons.find(btn => btn.textContent === "2");
      expect(step2Button?.className).toContain("ring-2");
    });
  });

  describe("interactions", () => {
    it("should call onStepClick when step is clicked", () => {
      const onStepClick = vi.fn();
      render(<Timeline steps={defaultSteps} onStepClick={onStepClick} />);

      // Click on step 2
      const step2Button = screen.getByText("2");
      fireEvent.click(step2Button);

      expect(onStepClick).toHaveBeenCalledWith("step-2");
    });

    it("should disable locked steps", () => {
      const lockedSteps = [
        { id: "step-1", number: 1, title: "Locked Step", status: "locked" as const },
      ];

      render(<Timeline steps={lockedSteps} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it("should not call onStepClick for locked steps", () => {
      const onStepClick = vi.fn();
      const lockedSteps = [
        { id: "step-1", number: 1, title: "Locked Step", status: "locked" as const },
      ];

      render(<Timeline steps={lockedSteps} onStepClick={onStepClick} />);

      const button = screen.getAllByRole("button")[0];
      fireEvent.click(button);

      expect(onStepClick).not.toHaveBeenCalled();
    });
  });

  describe("orientation", () => {
    it("should render vertical timeline by default", () => {
      const { container } = render(<Timeline steps={defaultSteps} />);

      expect(container.firstChild).toHaveClass("flex-col");
    });

    it("should render horizontal timeline when orientation is horizontal", () => {
      const { container } = render(<Timeline steps={defaultSteps} orientation="horizontal" />);

      expect(container.firstChild).toHaveClass("items-start");
      expect(container.firstChild).not.toHaveClass("flex-col");
    });
  });

  describe("connecting lines", () => {
    it("should not render connecting line after last step", () => {
      const { container } = render(
        <Timeline steps={[{ id: "1", number: 1, title: "Only Step", status: "current" }]} />
      );

      // Should not have any connecting lines (w-0.5 class)
      expect(container.querySelector(".w-0\\.5")).not.toBeInTheDocument();
    });
  });

  describe("custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(<Timeline steps={defaultSteps} className="custom-class" />);

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});

describe("ProgressTracker", () => {
  it("should render progress text", () => {
    render(<ProgressTracker completedSteps={3} totalSteps={5} />);

    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("3 of 5 steps")).toBeInTheDocument();
  });

  it("should calculate correct percentage", () => {
    const { container } = render(<ProgressTracker completedSteps={2} totalSteps={4} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.getAttribute("style")).toContain("width: 50%");
  });

  it("should show 0% when no steps completed", () => {
    const { container } = render(<ProgressTracker completedSteps={0} totalSteps={5} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.getAttribute("style")).toContain("width: 0%");
  });

  it("should show 100% when all steps completed", () => {
    const { container } = render(<ProgressTracker completedSteps={5} totalSteps={5} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.getAttribute("style")).toContain("width: 100%");
  });

  it("should use green color when 100% complete", () => {
    const { container } = render(<ProgressTracker completedSteps={5} totalSteps={5} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.className).toContain("bg-green-500");
  });

  it("should use blue color when not complete", () => {
    const { container } = render(<ProgressTracker completedSteps={3} totalSteps={5} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.className).toContain("bg-blue-500");
  });

  it("should handle 0 total steps", () => {
    const { container } = render(<ProgressTracker completedSteps={0} totalSteps={0} />);

    const progressBar = container.querySelector("[style*='width']");
    expect(progressBar?.getAttribute("style")).toContain("width: 0%");
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ProgressTracker completedSteps={1} totalSteps={2} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
