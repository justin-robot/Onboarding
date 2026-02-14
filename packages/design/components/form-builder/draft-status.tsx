"use client";

import React from "react";
import { Check, Loader2, AlertCircle, Cloud, Send, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { type DraftStatus } from "./use-form-draft";

interface DraftStatusIndicatorProps {
  status: DraftStatus;
  className?: string;
}

const statusConfig: Record<
  DraftStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    className: string;
  }
> = {
  loading: {
    icon: Loader2,
    text: "Loading...",
    className: "text-muted-foreground",
  },
  idle: {
    icon: Cloud,
    text: "Draft saved",
    className: "text-muted-foreground",
  },
  saving: {
    icon: Loader2,
    text: "Saving draft...",
    className: "text-muted-foreground",
  },
  saved: {
    icon: Check,
    text: "Draft saved",
    className: "text-success",
  },
  error: {
    icon: AlertCircle,
    text: "Failed to save",
    className: "text-destructive",
  },
  submitting: {
    icon: Send,
    text: "Submitting...",
    className: "text-primary",
  },
  submitted: {
    icon: CheckCircle2,
    text: "Submitted",
    className: "text-success",
  },
};

export function DraftStatusIndicator({
  status,
  className,
}: DraftStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimating = status === "loading" || status === "saving" || status === "submitting";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        config.className,
        className
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", isAnimating && "animate-spin")}
      />
      <span>{config.text}</span>
    </div>
  );
}
