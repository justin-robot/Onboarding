"use client";

import { CalendarIcon, Link2, AlertCircle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { cn } from "@repo/design/lib/utils";

interface DueDateDisplayProps {
  dueDate?: string | Date | null;
  dueDateType?: "absolute" | "relative";
  isCompleted?: boolean;
  className?: string;
}

export function DueDateDisplay({
  dueDate,
  dueDateType = "absolute",
  isCompleted = false,
  className,
}: DueDateDisplayProps) {
  if (!dueDate) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <CalendarIcon className="h-4 w-4" />
        <span>No due date</span>
      </div>
    );
  }

  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();
  const daysUntil = differenceInDays(date, now);
  const isOverdue = isPast(date) && !isCompleted;

  // Get color and status based on due date
  const getStatus = () => {
    if (isCompleted) {
      return { color: "text-muted-foreground", label: null };
    }
    if (isOverdue) {
      return { color: "text-red-600 dark:text-red-400", label: "Overdue" };
    }
    if (daysUntil <= 3) {
      return { color: "text-orange-600 dark:text-orange-400", label: "Due soon" };
    }
    if (daysUntil <= 7) {
      return { color: "text-yellow-600 dark:text-yellow-400", label: null };
    }
    return { color: "text-muted-foreground", label: null };
  };

  const status = getStatus();
  const formattedDate = format(date, "MMM d, yyyy");
  const Icon = dueDateType === "relative" ? Link2 : CalendarIcon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex items-center gap-2 text-sm", status.color)}>
        <Icon className="h-4 w-4" />
        <span>{formattedDate}</span>
        {isOverdue && (
          <span className="flex items-center gap-1 text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </span>
        )}
      </div>
      {dueDateType === "relative" && !isCompleted && (
        <span className="text-xs text-muted-foreground">(Relative)</span>
      )}
    </div>
  );
}
