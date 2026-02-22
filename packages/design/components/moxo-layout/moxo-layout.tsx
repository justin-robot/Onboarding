"use client";

import * as React from "react";
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Users,
  MoreHorizontal,
  FolderOpen,
  GitBranch,
  Menu,
  PanelRightOpen,
  Building2,
} from "lucide-react";
import { useIsDesktop } from "./use-media-query";

// Storage key for persisting panel sizes
const LAYOUT_STORAGE_KEY = "moxo-layout-sizes";

// Default panel sizes (percentages)
const DEFAULT_SIZES = {
  sidebar: 15,
  main: 55,
  right: 30,
};

// Minimum panel sizes
const MIN_SIZES = {
  sidebar: 10,
  main: 30,
  right: 15,
};

// Tab types for main content area
type MainTab = "flow" | "files";

interface WorkspaceHeaderProps {
  /** Workspace name */
  name: string;
  /** Optional banner image URL */
  bannerUrl?: string;
  /** Optional workspace icon/avatar */
  icon?: React.ReactNode;
  /** Member avatars to display */
  members?: Array<{ id: string; name: string; avatarUrl?: string }>;
  /** Total member count (if more than shown) */
  totalMembers?: number;
  /** Callback when members button clicked */
  onMembersClick?: () => void;
  /** Callback when more options clicked */
  onMoreClick?: () => void;
  /** Compact mode for mobile (no banner) */
  compact?: boolean;
  /** Custom action elements to render in header (e.g., notification bell) */
  actions?: React.ReactNode;
}

interface MoxoLayoutProps {
  /** Left sidebar content (workspace list) */
  sidebar: React.ReactNode;
  /** Flow tab content */
  flowContent: React.ReactNode;
  /** Files tab content */
  filesContent: React.ReactNode;
  /** Right panel content (activity/chat/details) */
  rightPanel: React.ReactNode;
  /** Workspace header info */
  workspace?: WorkspaceHeaderProps;
  /** Currently active tab */
  activeTab?: MainTab;
  /** Callback when tab changes */
  onTabChange?: (tab: MainTab) => void;
  /** Optional class name */
  className?: string;
  /** Whether to show the right panel */
  showRightPanel?: boolean;
  /** Callback when panel sizes change */
  onLayoutChange?: (sizes: number[]) => void;
  /** Title for mobile sidebar sheet */
  sidebarTitle?: string;
  /** Title for mobile right panel sheet */
  rightPanelTitle?: string;
  /** Controlled state for sidebar sheet (mobile) */
  sidebarOpen?: boolean;
  /** Callback when sidebar sheet open state changes */
  onSidebarOpenChange?: (open: boolean) => void;
  /** Controlled state for right panel sheet (mobile) */
  rightPanelOpen?: boolean;
  /** Callback when right panel sheet open state changes */
  onRightPanelOpenChange?: (open: boolean) => void;
}

/**
 * Workspace header with banner, icon, name, and member avatars
 */
function WorkspaceHeader({
  name,
  bannerUrl,
  icon,
  members = [],
  totalMembers,
  onMembersClick,
  onMoreClick,
  compact = false,
  actions,
}: WorkspaceHeaderProps) {
  const displayMembers = members.slice(0, compact ? 3 : 4);
  const remainingCount = (totalMembers || members.length) - displayMembers.length;

  // Compact header for mobile - no banner
  if (compact) {
    return (
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        {/* Icon and name */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm">
            {icon || (
              <span className="text-sm font-semibold">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-base font-semibold text-foreground truncate max-w-[180px]">
            {name}
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Member avatars (fewer on mobile) */}
          <div className="flex -space-x-1.5 mr-1">
            {displayMembers.map((member) => (
              <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback className="text-[10px]">
                  {member.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                +{remainingCount}
              </div>
            )}
          </div>

          {/* Custom actions (e.g., notification bell) */}
          {actions}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMembersClick}
          >
            <Users className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMoreClick}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Full header with banner for desktop
  return (
    <div className="relative">
      {/* Banner */}
      <div
        className={cn(
          "h-24 bg-gradient-to-r from-blue-600 to-blue-400",
          bannerUrl && "bg-cover bg-center"
        )}
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      />

      {/* Header content */}
      <div className="relative px-4 pb-3">
        {/* Icon/Avatar - positioned to overlap banner */}
        <div className="absolute -top-6 left-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-background bg-white shadow-sm">
            {icon || (
              <span className="text-lg font-semibold text-blue-600">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Name and actions */}
        <div className="flex items-center justify-between pt-8">
          <h1 className="text-lg font-semibold text-foreground">{name}</h1>

          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex -space-x-2">
              {displayMembers.map((member) => (
                <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                  <AvatarFallback className="text-xs">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {remainingCount > 0 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{remainingCount}
                </div>
              )}
            </div>

            {/* Custom actions (e.g., notification bell) */}
            {actions}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMembersClick}
            >
              <Users className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onMoreClick}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tab bar for Flow/Files switching
 */
function MainTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: MainTab;
  onTabChange?: (tab: MainTab) => void;
}) {
  return (
    <div className="flex border-b border-border">
      <button
        onClick={() => onTabChange?.("flow")}
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
          activeTab === "flow"
            ? "border-b-2 border-blue-600 text-blue-600"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <GitBranch className="h-4 w-4" />
        Flow
      </button>
      <button
        onClick={() => onTabChange?.("files")}
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
          activeTab === "files"
            ? "border-b-2 border-blue-600 text-blue-600"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <FolderOpen className="h-4 w-4" />
        Files
      </button>
    </div>
  );
}

/**
 * Mobile navigation bar with menu buttons
 */
function MobileNavBar({
  onOpenSidebar,
  onOpenRightPanel,
  showRightPanelButton,
  workspaceName,
}: {
  onOpenSidebar: () => void;
  onOpenRightPanel: () => void;
  showRightPanelButton: boolean;
  workspaceName?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onOpenSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open workspaces</span>
      </Button>

      {workspaceName && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm truncate max-w-[200px]">
            {workspaceName}
          </span>
        </div>
      )}

      {showRightPanelButton ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={onOpenRightPanel}
        >
          <PanelRightOpen className="h-5 w-5" />
          <span className="sr-only">Open details</span>
        </Button>
      ) : (
        <div className="w-9" /> // Spacer for layout balance
      )}
    </div>
  );
}

/**
 * Three-panel layout for Moxo workspace view
 * Uses react-resizable-panels for resizable, collapsible panels on desktop
 * Falls back to sheets/drawers on mobile and tablet
 */
export function MoxoLayout({
  sidebar,
  flowContent,
  filesContent,
  rightPanel,
  workspace,
  activeTab = "flow",
  onTabChange,
  className,
  showRightPanel = true,
  onLayoutChange,
  sidebarTitle = "Workspaces",
  rightPanelTitle = "Details",
  sidebarOpen,
  onSidebarOpenChange,
  rightPanelOpen,
  onRightPanelOpenChange,
}: MoxoLayoutProps) {
  const isDesktop = useIsDesktop();
  const [currentTab, setCurrentTab] = React.useState<MainTab>(activeTab);

  // Internal state for sheets when not controlled
  const [internalSidebarOpen, setInternalSidebarOpen] = React.useState(false);
  const [internalRightPanelOpen, setInternalRightPanelOpen] = React.useState(false);

  // Use controlled or internal state
  const isSidebarOpen = sidebarOpen ?? internalSidebarOpen;
  const isRightPanelOpen = rightPanelOpen ?? internalRightPanelOpen;

  const handleSidebarOpenChange = (open: boolean) => {
    if (onSidebarOpenChange) {
      onSidebarOpenChange(open);
    } else {
      setInternalSidebarOpen(open);
    }
  };

  const handleRightPanelOpenChange = (open: boolean) => {
    if (onRightPanelOpenChange) {
      onRightPanelOpenChange(open);
    } else {
      setInternalRightPanelOpen(open);
    }
  };

  // Sync with external activeTab prop
  React.useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  const handleTabChange = (tab: MainTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  // Save sizes to localStorage
  const saveSizes = React.useCallback((sizes: number[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(sizes));
    } catch {
      // Ignore errors
    }
  }, []);

  // Handle layout changes
  const handleLayout = React.useCallback(
    (sizes: number[]) => {
      saveSizes(sizes);
      onLayoutChange?.(sizes);
    },
    [saveSizes, onLayoutChange]
  );

  // Mobile/Tablet layout with sheets
  if (!isDesktop) {
    return (
      <div className={cn("flex h-full w-full flex-col", className)}>
        {/* Mobile Navigation Bar */}
        <MobileNavBar
          onOpenSidebar={() => handleSidebarOpenChange(true)}
          onOpenRightPanel={() => handleRightPanelOpenChange(true)}
          showRightPanelButton={showRightPanel}
          workspaceName={workspace?.name}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Workspace Header (compact on mobile) */}
          {workspace && <WorkspaceHeader {...workspace} compact />}

          {/* Tab Bar */}
          <MainTabBar activeTab={currentTab} onTabChange={handleTabChange} />

          {/* Tab Content */}
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {currentTab === "flow" ? flowContent : filesContent}
          </div>
        </div>

        {/* Left Sidebar Sheet */}
        <Sheet open={isSidebarOpen} onOpenChange={handleSidebarOpenChange}>
          <SheetContent side="left" className="w-[280px] p-0 sm:w-[320px]">
            <SheetHeader className="border-b border-border px-4 py-3">
              <SheetTitle>{sidebarTitle}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-x-auto overflow-y-auto">{sidebar}</div>
          </SheetContent>
        </Sheet>

        {/* Right Panel Sheet */}
        {showRightPanel && (
          <Sheet open={isRightPanelOpen} onOpenChange={handleRightPanelOpenChange}>
            <SheetContent side="right" className="w-[320px] p-0 sm:w-[380px]">
              <SheetHeader className="border-b border-border px-4 py-3">
                <SheetTitle>{rightPanelTitle}</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-x-auto overflow-y-auto">{rightPanel}</div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  // Desktop layout with resizable panels
  return (
    <div className={cn("h-full w-full", className)}>
      <PanelGroup
        direction="horizontal"
        onLayout={handleLayout}
        autoSaveId={LAYOUT_STORAGE_KEY}
      >
        {/* Left Sidebar */}
        <Panel
          id="sidebar"
          defaultSize={DEFAULT_SIZES.sidebar}
          minSize={MIN_SIZES.sidebar}
          maxSize={25}
          collapsible
          collapsedSize={0}
        >
          <div className="h-full overflow-x-auto overflow-y-auto border-r border-border bg-muted/30">
            {sidebar}
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />

        {/* Main Content */}
        <Panel
          id="main"
          defaultSize={showRightPanel ? DEFAULT_SIZES.main : DEFAULT_SIZES.main + DEFAULT_SIZES.right}
          minSize={MIN_SIZES.main}
        >
          <div className="flex h-full flex-col overflow-hidden">
            {/* Workspace Header */}
            {workspace && <WorkspaceHeader {...workspace} />}

            {/* Tab Bar */}
            <MainTabBar activeTab={currentTab} onTabChange={handleTabChange} />

            {/* Tab Content */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {currentTab === "flow" ? flowContent : filesContent}
            </div>
          </div>
        </Panel>

        {showRightPanel && (
          <>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize" />

            {/* Right Panel */}
            <Panel
              id="right"
              defaultSize={DEFAULT_SIZES.right}
              minSize={MIN_SIZES.right}
              maxSize={50}
              collapsible
              collapsedSize={0}
            >
              <div className="h-full overflow-x-auto overflow-y-auto border-l border-border bg-muted/10">
                {rightPanel}
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

/**
 * Resize handle component with visual feedback
 */
export function ResizeHandle({
  className,
  orientation = "vertical",
}: {
  className?: string;
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <PanelResizeHandle
      className={cn(
        "relative transition-colors",
        orientation === "vertical"
          ? "w-1 hover:bg-primary/20 cursor-col-resize"
          : "h-1 hover:bg-primary/20 cursor-row-resize",
        "after:absolute after:inset-0 after:bg-border",
        className
      )}
    />
  );
}
