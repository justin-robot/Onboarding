"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Check } from "lucide-react";

type TimelineStepStatus = "completed" | "current" | "upcoming" | "locked";

interface TimelineStep {
  /** Step ID */
  id: string;
  /** Step number (1-indexed) */
  number: number;
  /** Step title */
  title: string;
  /** Step status */
  status: TimelineStepStatus;
  /** Optional description */
  description?: string;
}

interface TimelineProps {
  /** Steps to display */
  steps: TimelineStep[];
  /** Currently selected step ID */
  selectedStepId?: string;
  /** Callback when a step is clicked */
  onStepClick?: (stepId: string) => void;
  /** Optional class name */
  className?: string;
  /** Orientation */
  orientation?: "vertical" | "horizontal";
}

// Status styling configuration
const statusConfig: Record<
  TimelineStepStatus,
  {
    circleClass: string;
    lineClass: string;
    textClass: string;
    showCheck: boolean;
  }
> = {
  completed: {
    circleClass: "bg-green-500 text-white border-green-500",
    lineClass: "bg-green-500",
    textClass: "text-foreground",
    showCheck: true,
  },
  current: {
    circleClass: "bg-blue-500 text-white border-blue-500",
    lineClass: "bg-slate-200 dark:bg-slate-700",
    textClass: "text-foreground font-medium",
    showCheck: false,
  },
  upcoming: {
    circleClass: "bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-600",
    lineClass: "bg-slate-200 dark:bg-slate-700",
    textClass: "text-muted-foreground",
    showCheck: false,
  },
  locked: {
    circleClass: "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
    lineClass: "bg-slate-200 dark:bg-slate-700",
    textClass: "text-muted-foreground opacity-50",
    showCheck: false,
  },
};

/**
 * Vertical timeline with numbered steps
 * Matches Moxo's flow view design
 */
export function Timeline({
  steps,
  selectedStepId,
  onStepClick,
  className,
  orientation = "vertical",
}: TimelineProps) {
  if (orientation === "horizontal") {
    return (
      <HorizontalTimeline
        steps={steps}
        selectedStepId={selectedStepId}
        onStepClick={onStepClick}
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const isLast = index === steps.length - 1;
        const isSelected = step.id === selectedStepId;

        return (
          <div key={step.id} className="flex">
            {/* Timeline connector */}
            <div className="flex flex-col items-center mr-4">
              {/* Circle */}
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === "locked"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  config.circleClass,
                  isSelected && "ring-2 ring-blue-500 ring-offset-2",
                  step.status !== "locked" && "hover:scale-110 cursor-pointer"
                )}
              >
                {config.showCheck ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </button>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[2rem]",
                    config.lineClass
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div
              className={cn(
                "pb-6 pt-1",
                isLast && "pb-0"
              )}
            >
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === "locked"}
                className={cn(
                  "text-left",
                  step.status !== "locked" && "hover:text-blue-600 cursor-pointer"
                )}
              >
                <p className={cn("text-sm", config.textClass)}>{step.title}</p>
                {step.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Horizontal timeline variant
 */
function HorizontalTimeline({
  steps,
  selectedStepId,
  onStepClick,
  className,
}: Omit<TimelineProps, "orientation">) {
  return (
    <div className={cn("flex items-start overflow-x-auto", className)}>
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const isLast = index === steps.length - 1;
        const isSelected = step.id === selectedStepId;

        return (
          <div key={step.id} className="flex items-start">
            {/* Step */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === "locked"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  config.circleClass,
                  isSelected && "ring-2 ring-blue-500 ring-offset-2",
                  step.status !== "locked" && "hover:scale-110 cursor-pointer"
                )}
              >
                {config.showCheck ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </button>

              {/* Title */}
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={step.status === "locked"}
                className={cn(
                  "mt-2 max-w-[100px] text-center",
                  step.status !== "locked" && "hover:text-blue-600 cursor-pointer"
                )}
              >
                <p className={cn("text-xs", config.textClass)}>{step.title}</p>
              </button>
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-12 mt-4 mx-1",
                  statusConfig[step.status].lineClass
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Progress tracker showing completion status
 * Used in Action Details panel
 */
export function ProgressTracker({
  completedSteps,
  totalSteps,
  className,
}: {
  completedSteps: number;
  totalSteps: number;
  className?: string;
}) {
  const percentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">
          {completedSteps} of {totalSteps} steps
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage === 100 ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export type { TimelineProps, TimelineStep, TimelineStepStatus };
