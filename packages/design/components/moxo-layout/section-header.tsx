"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

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
}

// Status badge configuration
const statusConfig: Record<
  SectionStatus,
  { label: string; className: string }
> = {
  not_started: {
    label: "Not Started",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
};

/**
 * Section header component matching Moxo's design
 * Features blue left border, status badge, and progress counter
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
}: SectionHeaderProps) {
  const config = statusConfig[status];
  const hasProgress = totalCount > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border-l-4 bg-muted/30 px-4 py-3",
          status === "in_progress" && "border-l-blue-500",
          status === "completed" && "border-l-green-500",
          status === "not_started" && "border-l-slate-300 dark:border-l-slate-600"
        )}
      >
        {/* Collapse toggle */}
        {collapsible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Title and description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {title}
            </h2>
            <Badge
              variant="secondary"
              className={cn("text-[10px] px-1.5 py-0 font-medium", config.className)}
            >
              {config.label}
            </Badge>
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>

        {/* Progress counter */}
        {hasProgress && (
          <div className="shrink-0 text-right">
            <span className="text-sm font-medium text-foreground">
              {completedCount}
            </span>
            <span className="text-sm text-muted-foreground"> of {totalCount}</span>
          </div>
        )}
      </div>

      {/* Children (tasks) - only show when not collapsed */}
      {!isCollapsed && children && (
        <div className="space-y-2 pl-4">{children}</div>
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
