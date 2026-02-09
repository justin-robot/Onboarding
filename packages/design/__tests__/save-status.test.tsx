import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveStatusIndicator, type SaveStatus } from "../components/form-builder";

describe("SaveStatusIndicator", () => {
  it("should render idle state", () => {
    render(<SaveStatusIndicator status="idle" />);
    expect(screen.getByText("All changes saved")).toBeInTheDocument();
  });

  it("should render saving state", () => {
    render(<SaveStatusIndicator status="saving" />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("should render saved state", () => {
    render(<SaveStatusIndicator status="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("should render error state", () => {
    render(<SaveStatusIndicator status="error" />);
    expect(screen.getByText("Failed to save")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <SaveStatusIndicator status="idle" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should have animate-spin class when saving", () => {
    const { container } = render(<SaveStatusIndicator status="saving" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("animate-spin");
  });
});
