import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  MoxoLayout,
  WorkspaceSidebar,
  FlowView,
  useMediaQuery,
  useIsDesktop,
  useIsMobile,
} from "../components/moxo-layout";

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  return (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
};

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return false when media query does not match", () => {
    window.matchMedia = createMatchMedia(false) as typeof window.matchMedia;

    const TestComponent = () => {
      const matches = useMediaQuery("(min-width: 1024px)");
      return <div data-testid="result">{matches ? "true" : "false"}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId("result").textContent).toBe("false");
  });

  it("should return true when media query matches", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    const TestComponent = () => {
      const matches = useMediaQuery("(min-width: 1024px)");
      return <div data-testid="result">{matches ? "true" : "false"}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId("result").textContent).toBe("true");
  });
});

describe("MoxoLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render desktop layout with panels when desktop", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    render(
      <MoxoLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        flowContent={<div data-testid="flow">Flow</div>}
        filesContent={<div data-testid="files">Files</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
        workspace={{ name: "Test Workspace" }}
      />
    );

    // Sidebar should be visible in the panel layout
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("flow")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
  });

  it("should render mobile layout with sheets when not desktop", () => {
    window.matchMedia = createMatchMedia(false) as typeof window.matchMedia;

    render(
      <MoxoLayout
        sidebar={<div data-testid="sidebar">Sidebar</div>}
        flowContent={<div data-testid="flow">Flow</div>}
        filesContent={<div data-testid="files">Files</div>}
        rightPanel={<div data-testid="right-panel">Right Panel</div>}
        workspace={{ name: "Test Workspace" }}
      />
    );

    // Mobile nav should be present
    expect(screen.getByRole("button", { name: /open workspaces/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open details/i })).toBeInTheDocument();

    // Flow content should still be visible
    expect(screen.getByTestId("flow")).toBeInTheDocument();
  });

  it("should open sidebar sheet on mobile when menu button clicked", () => {
    window.matchMedia = createMatchMedia(false) as typeof window.matchMedia;

    const onSidebarOpenChange = vi.fn();

    render(
      <MoxoLayout
        sidebar={<div>Sidebar</div>}
        flowContent={<div>Flow</div>}
        filesContent={<div>Files</div>}
        rightPanel={<div>Right Panel</div>}
        workspace={{ name: "Test Workspace" }}
        onSidebarOpenChange={onSidebarOpenChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open workspaces/i }));
    expect(onSidebarOpenChange).toHaveBeenCalledWith(true);
  });

  it("should switch between flow and files tabs", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    const onTabChange = vi.fn();

    render(
      <MoxoLayout
        sidebar={<div>Sidebar</div>}
        flowContent={<div data-testid="flow">Flow</div>}
        filesContent={<div data-testid="files">Files</div>}
        rightPanel={<div>Right Panel</div>}
        workspace={{ name: "Test Workspace" }}
        onTabChange={onTabChange}
      />
    );

    // Click Files tab
    fireEvent.click(screen.getByRole("button", { name: /files/i }));
    expect(onTabChange).toHaveBeenCalledWith("files");
  });
});

describe("WorkspaceSidebar", () => {
  it("should render workspace list", () => {
    render(
      <WorkspaceSidebar
        workspaces={[
          { id: "1", name: "Workspace 1", progress: 50 },
          { id: "2", name: "Workspace 2", isCompleted: true },
        ]}
        selectedWorkspaceId="1"
      />
    );

    expect(screen.getByText("Workspace 1")).toBeInTheDocument();
    expect(screen.getByText("Workspace 2")).toBeInTheDocument();
  });

  it("should call onWorkspaceSelect when workspace clicked", () => {
    const onSelect = vi.fn();

    render(
      <WorkspaceSidebar
        workspaces={[{ id: "1", name: "Workspace 1" }]}
        onWorkspaceSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText("Workspace 1"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });
});

describe("FlowView", () => {
  const mockSections = [
    {
      id: "section-1",
      title: "Getting Started",
      status: "in_progress" as const,
      tasks: [
        { id: "task-1", title: "Task 1", type: "form" as const, position: 1, isYourTurn: true },
        { id: "task-2", title: "Task 2", type: "acknowledgement" as const, position: 2 },
      ],
    },
  ];

  it("should render sections and tasks", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    render(<FlowView sections={mockSections} />);

    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    // Use getAllByText since task titles appear in both timeline and task cards
    expect(screen.getAllByText("Task 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Task 2").length).toBeGreaterThan(0);
  });

  it("should show timeline on desktop when enabled", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    render(<FlowView sections={mockSections} showTimeline />);

    expect(screen.getByText("Steps")).toBeInTheDocument();
  });

  it("should hide timeline on mobile", () => {
    window.matchMedia = createMatchMedia(false) as typeof window.matchMedia;

    render(<FlowView sections={mockSections} showTimeline />);

    // Timeline should be hidden (not in DOM or hidden via CSS)
    // The component uses CSS classes to hide, so we check for the class
    const stepsElements = screen.queryAllByText("Steps");
    // On mobile, the Steps heading may still be in DOM but hidden with lg:block
    expect(stepsElements.length).toBe(0);
  });

  it("should call onTaskSelect when task clicked", () => {
    window.matchMedia = createMatchMedia(true) as typeof window.matchMedia;

    const onTaskSelect = vi.fn();

    render(<FlowView sections={mockSections} onTaskSelect={onTaskSelect} />);

    // Click the task card button (not the timeline step)
    // The task card has the "Form" label
    const taskCards = screen.getAllByRole("button", { name: /task 1/i });
    // Click the first button that contains "Form" (the task card)
    const taskCard = taskCards.find(el => el.textContent?.includes("Form"));
    if (taskCard) {
      fireEvent.click(taskCard);
    } else {
      // Fallback: click the first matching button
      fireEvent.click(taskCards[0]);
    }
    expect(onTaskSelect).toHaveBeenCalledWith("task-1");
  });
});
