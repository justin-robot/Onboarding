"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";

type SectionStatus = "not_started" | "in_progress" | "completed";

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Section status */
  status?: SectionStatus;
  /** Number of completed tasks */
  completedCount?: number;
  /** Total number of tasks */
  totalCount?: number;
  /** Whether section is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse toggle clicked */
  onToggleCollapse?: () => void;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Optional description */
  description?: string;
  /** Optional class name */
  className?: string;
  /** Children (tasks) */
  children?: React.ReactNode;
  /** Callback when menu button clicked */
  onMenuClick?: () => void;
  /** Menu items for dropdown */
  menuItems?: Array<{ label: string; onClick: () => void }>;
}

// Status badge configuration
const statusConfig: Record<
  SectionStatus,
  { label: string; badgeClassName: string; borderClassName: string }
> = {
  not_started: {
    label: "Not Started",
    badgeClassName: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    borderClassName: "border-slate-300 dark:border-slate-600",
  },
  in_progress: {
    label: "In Progress",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderClassName: "border-blue-500",
  },
  completed: {
    label: "Completed",
    badgeClassName: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    borderClassName: "border-green-500",
  },
};

/**
 * Section header component matching Moxo's design
 * Features full border container, status badge, and progress counter
 */
export function SectionHeader({
  title,
  status = "not_started",
  completedCount = 0,
  totalCount = 0,
  isCollapsed = false,
  onToggleCollapse,
  collapsible = true,
  description,
  className,
  children,
  onMenuClick,
}: SectionHeaderProps) {
  const config = statusConfig[status];
  const hasProgress = totalCount > 0;

  return (
    <div
      className={cn(
        "rounded-xl border",
        config.borderClassName,
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground truncate">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>

        {/* Status badge and counter */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs px-2 py-0.5 font-medium",
              config.badgeClassName
            )}
          >
            {config.label}
          </Badge>
          {hasProgress && (
            <span className="text-sm text-muted-foreground">
              {completedCount} of {totalCount}
            </span>
          )}
        </div>

        {/* Menu button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onMenuClick}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}

        {/* Collapse toggle */}
        {collapsible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Children (tasks) - only show when not collapsed */}
      {!isCollapsed && children && (
        <div className="px-4 pb-4">{children}</div>
      )}
    </div>
  );
}

/**
 * Wrapper for section content with proper spacing
 */
export function SectionContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export type { SectionHeaderProps, SectionStatus };
