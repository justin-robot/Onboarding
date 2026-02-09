"use client";

import React from "react";
import { Check, Loader2, AlertCircle, Cloud } from "lucide-react";
import { cn } from "../../lib/utils";
import { type SaveStatus } from "./use-form-builder";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

const statusConfig: Record<
  SaveStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    className: string;
  }
> = {
  idle: {
    icon: Cloud,
    text: "All changes saved",
    className: "text-muted-foreground",
  },
  saving: {
    icon: Loader2,
    text: "Saving...",
    className: "text-muted-foreground",
  },
  saved: {
    icon: Check,
    text: "Saved",
    className: "text-success",
  },
  error: {
    icon: AlertCircle,
    text: "Failed to save",
    className: "text-destructive",
  },
};

export function SaveStatusIndicator({
  status,
  className,
}: SaveStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        config.className,
        className
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")}
      />
      <span>{config.text}</span>
    </div>
  );
}
