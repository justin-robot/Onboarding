"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Plus, Home, CheckCircle2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  /** Progress percentage 0-100 */
  progress?: number;
  /** Optional icon/avatar */
  icon?: React.ReactNode;
  /** Optional icon background color (hex or tailwind class) */
  iconBgColor?: string;
  /** Whether workspace is completed */
  isCompleted?: boolean;
  /** Last activity timestamp */
  lastActivity?: Date | string;
}

interface WorkspaceSidebarProps {
  /** List of workspaces to display */
  workspaces: Workspace[];
  /** Currently selected workspace ID */
  selectedWorkspaceId?: string;
  /** Callback when a workspace is clicked */
  onWorkspaceSelect?: (workspaceId: string) => void;
  /** Callback when create button is clicked */
  onCreateWorkspace?: () => void;
  /** Callback when home button is clicked */
  onHomeClick?: () => void;
  /** Whether workspaces are loading */
  isLoading?: boolean;
  /** Optional class name */
  className?: string;
  /** Header title (defaults to "Workspaces") */
  title?: string;
  /** Footer content (e.g., user menu) */
  footer?: React.ReactNode;
}

/**
 * Workspace list sidebar with navigation
 * Matches Moxo's minimal sidebar design
 */
export function WorkspaceSidebar({
  workspaces,
  selectedWorkspaceId,
  onWorkspaceSelect,
  onCreateWorkspace,
  onHomeClick,
  isLoading,
  className,
  title = "Workspaces",
  footer,
}: WorkspaceSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col bg-slate-50 dark:bg-slate-900", className)}>
      {/* Home Button */}
      {onHomeClick && (
        <div className="border-b border-border/50 p-1.5">
          <button
            onClick={onHomeClick}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
              "hover:bg-white dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700">
              <Home className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Home</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {onCreateWorkspace && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateWorkspace}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="sr-only">Create workspace</span>
          </Button>
        )}
      </div>

      {/* Workspace List */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-1.5">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <WorkspaceItemSkeleton key={i} />
            ))
          ) : workspaces.length === 0 ? (
            <div className="px-2 py-8 text-center text-xs text-muted-foreground">
              No workspaces yet
            </div>
          ) : (
            workspaces.map((workspace) => (
              <WorkspaceItem
                key={workspace.id}
                workspace={workspace}
                isSelected={workspace.id === selectedWorkspaceId}
                onClick={() => onWorkspaceSelect?.(workspace.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer (e.g., user menu) */}
      {footer && (
        <div className="border-t border-border/50 p-2">
          {footer}
        </div>
      )}
    </div>
  );
}

interface WorkspaceItemProps {
  workspace: Workspace;
  isSelected?: boolean;
  onClick?: () => void;
}

function WorkspaceItem({ workspace, isSelected, onClick }: WorkspaceItemProps) {
  // Parse icon background color
  const bgColorStyle = workspace.iconBgColor?.startsWith("#")
    ? { backgroundColor: workspace.iconBgColor }
    : undefined;
  const bgColorClass = workspace.iconBgColor && !workspace.iconBgColor.startsWith("#")
    ? workspace.iconBgColor
    : "bg-blue-500";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-white dark:hover:bg-slate-800",
        isSelected && "bg-white dark:bg-slate-800 shadow-sm"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white",
          !bgColorStyle && bgColorClass
        )}
        style={bgColorStyle}
      >
        {workspace.icon || (
          <span className="text-sm font-semibold">
            {workspace.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "truncate text-sm",
            isSelected ? "font-medium text-foreground" : "text-foreground/80"
          )}>
            {workspace.name}
          </span>
          {workspace.isCompleted && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
          )}
        </div>
        {typeof workspace.progress === "number" && !workspace.isCompleted && (
          <div className="mt-0.5">
            <ProgressIndicator value={workspace.progress} size="sm" />
          </div>
        )}
      </div>
    </button>
  );
}

function WorkspaceItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-1.5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

interface ProgressIndicatorProps {
  value: number;
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

function ProgressIndicator({ value, className, size = "md", showLabel = true }: ProgressIndicatorProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className={cn(
        "flex-1 rounded-full bg-slate-200 dark:bg-slate-700",
        size === "sm" ? "h-1" : "h-1.5"
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all",
            clampedValue === 100 ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          "text-muted-foreground tabular-nums",
          size === "sm" ? "text-[10px]" : "text-xs"
        )}>
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}

export type { Workspace, WorkspaceSidebarProps };
