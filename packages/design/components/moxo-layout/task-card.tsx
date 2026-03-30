"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { formatTaskTimestamp } from "../../lib/date-utils";
import { Button } from "../ui/button";
import { format, differenceInDays, isPast } from "date-fns";
import {
  FileText,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
  LucideIcon,
  Check,
  Lock,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

// Task types matching the database schema
type TaskType =
  | "form"
  | "acknowledgement"
  | "file_upload"
  | "approval"
  | "booking"
  | "esign";

// Timeline status for inline display
type TimelineStatus = "completed" | "current" | "upcoming";

interface TaskCardProps {
  /** Task ID */
  id: string;
  /** Task title */
  title: string;
  /** Task type */
  type: TaskType;
  /** Whether it's the current user's turn to act */
  isYourTurn?: boolean;
  /** Whether task is completed */
  isCompleted?: boolean;
  /** Whether task is locked (dependencies not met) */
  isLocked?: boolean;
  /** Tasks that are blocking this task (shown in lock tooltip) */
  lockedByTasks?: Array<{ id: string; title: string }>;
  /** Whether this task is currently selected */
  isSelected?: boolean;
  /** Whether this task was recently completed (shows green highlight) */
  isRecentlyCompleted?: boolean;
  /** Position in the timeline (1-indexed) */
  position?: number;
  /** Optional description or subtitle */
  description?: string;
  /** Due date if any */
  dueDate?: Date | string;
  /** When the task was created */
  createdAt?: Date | string;
  /** Assignee names */
  assignees?: string[];
  /** Click handler */
  onClick?: () => void;
  /** Optional class name */
  className?: string;
  /** Whether to show inline timeline indicator */
  showTimelineIndicator?: boolean;
  /** Timeline position number to display */
  timelinePosition?: number;
  /** Timeline status for styling */
  timelineStatus?: TimelineStatus;
  /** Whether this is the last task in the section */
  isLastInSection?: boolean;
  /** Click handler for Review button */
  onReviewClick?: () => void;
  /** Whether task was created in draft mode (visible to managers only) */
  isDraft?: boolean;
}

// Type-specific styling configuration - using solid colors to match Add Task dialog
const typeConfig: Record<
  TaskType,
  { icon: LucideIcon; bgColor: string; textColor: string; label: string }
> = {
  form: {
    icon: FileText,
    bgColor: "bg-teal-600",
    textColor: "text-white",
    label: "Form",
  },
  acknowledgement: {
    icon: CheckSquare,
    bgColor: "bg-amber-600",
    textColor: "text-white",
    label: "Acknowledgement",
  },
  file_upload: {
    icon: Upload,
    bgColor: "bg-purple-600",
    textColor: "text-white",
    label: "File Upload",
  },
  approval: {
    icon: ThumbsUp,
    bgColor: "bg-blue-600",
    textColor: "text-white",
    label: "Approval",
  },
  booking: {
    icon: Calendar,
    bgColor: "bg-orange-600",
    textColor: "text-white",
    label: "Booking",
  },
  esign: {
    icon: FileSignature,
    bgColor: "bg-indigo-600",
    textColor: "text-white",
    label: "E-Signature",
  },
};

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Get due date badge info
 */
function getDueDateBadge(
  dueDate: Date | string | undefined,
  isCompleted: boolean | undefined
): { label: string; colorClass: string; isOverdue: boolean } | null {
  if (!dueDate || isCompleted) return null;

  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();
  const daysUntil = differenceInDays(date, now);
  const isOverdue = isPast(date);

  if (isOverdue) {
    return {
      label: "Overdue",
      colorClass: "text-red-600 dark:text-red-400",
      isOverdue: true,
    };
  }
  if (daysUntil <= 3) {
    return {
      label: `${daysUntil}d`,
      colorClass: "text-orange-600 dark:text-orange-400",
      isOverdue: false,
    };
  }
  if (daysUntil <= 7) {
    return {
      label: `${daysUntil}d`,
      colorClass: "text-yellow-600 dark:text-yellow-400",
      isOverdue: false,
    };
  }
  return {
    label: format(date, "MMM d"),
    colorClass: "text-muted-foreground",
    isOverdue: false,
  };
}

/**
 * Get status subtitle text
 */
function getStatusSubtitle(
  isCompleted?: boolean,
  isYourTurn?: boolean,
  isLocked?: boolean
): { text: string; className: string } {
  if (isCompleted) {
    return { text: "Completed", className: "text-muted-foreground" };
  }
  if (isYourTurn) {
    return { text: "Your Turn", className: "text-green-600 dark:text-green-400 font-medium" };
  }
  if (isLocked) {
    return { text: "Not Started", className: "text-muted-foreground" };
  }
  return { text: "In Progress", className: "text-muted-foreground" };
}

/**
 * Timeline indicator component
 */
function TimelineIndicator({
  status,
  position,
  isLast,
}: {
  status: TimelineStatus;
  position: number;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center shrink-0 mr-3">
      {/* Circle */}
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
          status === "completed" && "bg-green-500 text-white",
          status === "current" && "bg-blue-500 text-white",
          status === "upcoming" && "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        )}
      >
        {status === "completed" ? (
          <Check className="h-4 w-4" />
        ) : (
          position
        )}
      </div>
      {/* Connecting line */}
      {!isLast && (
        <div
          className={cn(
            "w-0.5 flex-1 min-h-[24px]",
            status === "completed" ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
          )}
        />
      )}
    </div>
  );
}

/**
 * Assignee avatar component - rounded rectangle style matching Moxo
 */
function AssigneeAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-500 text-white text-xs font-medium">
      {getInitials(name)}
    </div>
  );
}

/**
 * Task card component matching Moxo's design
 * Shows inline timeline, task type icon, title with status subtitle, and assignee avatars
 */
export function TaskCard({
  id,
  title,
  type,
  isYourTurn,
  isCompleted,
  isLocked,
  lockedByTasks,
  isSelected,
  isRecentlyCompleted,
  position,
  description,
  dueDate,
  createdAt,
  assignees,
  onClick,
  className,
  showTimelineIndicator = false,
  timelinePosition,
  timelineStatus = "upcoming",
  isLastInSection = false,
  onReviewClick,
  isDraft,
}: TaskCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const statusSubtitle = getStatusSubtitle(isCompleted, isYourTurn, isLocked);
  const hasBlockingTasks = lockedByTasks && lockedByTasks.length > 0;
  const dueDateBadge = getDueDateBadge(dueDate, isCompleted);

  // Handle review button click without triggering card click
  const handleReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReviewClick?.();
  };

  return (
    <div className={cn("flex", className)}>
      {/* Timeline indicator */}
      {showTimelineIndicator && timelinePosition !== undefined && (
        <TimelineIndicator
          status={timelineStatus}
          position={timelinePosition}
          isLast={isLastInSection}
        />
      )}

      {/* Task content */}
      <button
        onClick={onClick}
        className={cn(
          "group relative flex flex-1 items-center gap-3 py-3 px-4 text-left transition-all rounded-lg border",
          "hover:border-gray-300 dark:hover:border-gray-600",
          // Recently completed task gets green highlight with animation
          isRecentlyCompleted && "border-green-500 bg-green-50/50 dark:bg-green-950/20 ring-2 ring-green-500/30 animate-pulse",
          // Current/active task gets highlighted border
          !isRecentlyCompleted && timelineStatus === "current" && "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm",
          // Default subtle border
          !isRecentlyCompleted && timelineStatus !== "current" && "border-gray-200 dark:border-gray-700",
          !isRecentlyCompleted && isSelected && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
          isLocked && "opacity-60"
        )}
      >
        {/* Type Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            config.bgColor
          )}
        >
          <Icon className={cn("h-5 w-5", config.textColor)} />
        </div>

        {/* Title and Status */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "truncate text-sm font-medium",
              isCompleted && "text-muted-foreground"
            )}
          >
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-xs", statusSubtitle.className)}>
              {statusSubtitle.text}
            </span>
            {isDraft && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Draft
              </span>
            )}
            {dueDateBadge && (
              <span className={cn("flex items-center gap-1 text-xs font-medium", dueDateBadge.colorClass)}>
                {dueDateBadge.isOverdue && <AlertCircle className="h-3 w-3" />}
                {dueDateBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* Lock indicator for locked tasks */}
        {isLocked && (
          <div className="shrink-0">
            {hasBlockingTasks ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 cursor-help">
                    <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium text-xs mb-1">Waiting for:</p>
                  <ul className="text-xs space-y-0.5">
                    {lockedByTasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                <Lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Review button for Your Turn tasks OR Assignee avatars */}
        <div className="flex items-center gap-2 shrink-0">
          {isYourTurn && !isCompleted && onReviewClick && (
            <span
              role="button"
              tabIndex={0}
              className="inline-flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 h-8 font-medium cursor-pointer"
              onClick={handleReviewClick}
              onKeyDown={(e) => e.key === "Enter" && handleReviewClick(e as unknown as React.MouseEvent)}
            >
              Review
            </span>
          )}
          {assignees && assignees.length > 0 && (
            <div className="flex -space-x-1">
              {assignees.slice(0, 3).map((name, i) => (
                <AssigneeAvatar key={i} name={name} />
              ))}
              {assignees.length > 3 && (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-400 text-white text-xs font-medium border-2 border-background">
                  +{assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

export type { TaskCardProps, TaskType, TimelineStatus };
