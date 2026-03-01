"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { formatTaskTimestamp } from "../../lib/date-utils";
import { Button } from "../ui/button";
import {
  FileText,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
  LucideIcon,
  Check,
} from "lucide-react";

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
  /** Whether this task is currently selected */
  isSelected?: boolean;
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
}

// Type-specific styling configuration
const typeConfig: Record<
  TaskType,
  { icon: LucideIcon; bgColor: string; textColor: string; label: string }
> = {
  form: {
    icon: FileText,
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
    textColor: "text-teal-600 dark:text-teal-400",
    label: "Form",
  },
  acknowledgement: {
    icon: CheckSquare,
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    label: "Acknowledgement",
  },
  file_upload: {
    icon: Upload,
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-600 dark:text-purple-400",
    label: "File Upload",
  },
  approval: {
    icon: ThumbsUp,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-600 dark:text-blue-400",
    label: "Approval",
  },
  booking: {
    icon: Calendar,
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-600 dark:text-orange-400",
    label: "Booking",
  },
  esign: {
    icon: FileSignature,
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    textColor: "text-indigo-600 dark:text-indigo-400",
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
  isSelected,
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
}: TaskCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const statusSubtitle = getStatusSubtitle(isCompleted, isYourTurn, isLocked);

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
          // Current/active task gets highlighted border
          timelineStatus === "current" && "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm",
          // Default subtle border
          timelineStatus !== "current" && "border-gray-200 dark:border-gray-700",
          isSelected && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
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
          <p className={cn("text-xs mt-0.5", statusSubtitle.className)}>
            {statusSubtitle.text}
          </p>
        </div>

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
