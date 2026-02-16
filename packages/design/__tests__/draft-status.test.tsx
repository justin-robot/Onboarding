import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DraftStatusIndicator, type DraftStatus } from "../components/form-builder";

describe("DraftStatusIndicator", () => {
  it("should render loading state", () => {
    render(<DraftStatusIndicator status="loading" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should render idle state", () => {
    render(<DraftStatusIndicator status="idle" />);
    expect(screen.getByText("Draft saved")).toBeInTheDocument();
  });

  it("should render saving state", () => {
    render(<DraftStatusIndicator status="saving" />);
    expect(screen.getByText("Saving draft...")).toBeInTheDocument();
  });

  it("should render saved state", () => {
    render(<DraftStatusIndicator status="saved" />);
    expect(screen.getByText("Draft saved")).toBeInTheDocument();
  });

  it("should render error state", () => {
    render(<DraftStatusIndicator status="error" />);
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });

  it("should render submitting state", () => {
    render(<DraftStatusIndicator status="submitting" />);
    expect(screen.getByText("Submitting...")).toBeInTheDocument();
  });

  it("should render submitted state", () => {
    render(<DraftStatusIndicator status="submitted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <DraftStatusIndicator status="idle" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have animate-spin class when loading", () => {
    const { container } = render(<DraftStatusIndicator status="loading" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });

  it("should have animate-spin class when saving", () => {
    const { container } = render(<DraftStatusIndicator status="saving" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });

  it("should have animate-spin class when submitting", () => {
    const { container } = render(<DraftStatusIndicator status="submitting" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });
});
