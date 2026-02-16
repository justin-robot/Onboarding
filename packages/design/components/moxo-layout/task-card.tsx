"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
  FileText,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
  LucideIcon,
} from "lucide-react";

// Task types matching the database schema
type TaskType =
  | "form"
  | "acknowledgement"
  | "file_upload"
  | "approval"
  | "booking"
  | "esign";

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
  /** Assignee names */
  assignees?: string[];
  /** Click handler */
  onClick?: () => void;
  /** Optional class name */
  className?: string;
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
 * Task card component matching Moxo's design
 * Shows task type icon, title, and status indicators
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
  assignees,
  onClick,
  className,
}: TaskCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Format due date
  const formattedDueDate = dueDate
    ? typeof dueDate === "string"
      ? new Date(dueDate).toLocaleDateString()
      : dueDate.toLocaleDateString()
    : null;

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "group relative flex w-full gap-3 rounded-lg border p-3 text-left transition-all",
        "hover:border-blue-300 hover:shadow-sm",
        isSelected && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
        isCompleted && "border-green-200 bg-green-50/30 dark:bg-green-950/10",
        isLocked && "cursor-not-allowed opacity-50",
        !isSelected && !isCompleted && "border-border bg-background",
        className
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title with position */}
            <div className="flex items-center gap-2">
              {position && (
                <span className="text-xs font-medium text-muted-foreground">
                  {position}.
                </span>
              )}
              <h3
                className={cn(
                  "truncate text-sm font-medium",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {title}
              </h3>
            </div>

            {/* Description */}
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}

            {/* Meta info */}
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("font-medium", config.textColor)}>
                {config.label}
              </span>
              {formattedDueDate && (
                <>
                  <span>•</span>
                  <span>Due {formattedDueDate}</span>
                </>
              )}
              {assignees && assignees.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {assignees.length === 1
                      ? assignees[0]
                      : `${assignees.length} assignees`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex shrink-0 items-center gap-1.5">
            {isYourTurn && !isCompleted && (
              <Badge
                variant="default"
                className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0"
              >
                Your Turn
              </Badge>
            )}
            {isCompleted && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0"
              >
                Complete
              </Badge>
            )}
            {isLocked && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                Locked
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export type { TaskCardProps, TaskType };
