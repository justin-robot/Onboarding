"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ProgressTracker } from "./timeline";
import { ActivityFeed, AuditEntry } from "./activity-feed";
import {
  FileText,
  Paperclip,
  MessageSquare,
  History,
  Download,
  ExternalLink,
  X,
  CheckSquare,
  Upload,
  Calendar,
  FileSignature,
  ThumbsUp,
  LucideIcon,
} from "lucide-react";

type TaskType =
  | "form"
  | "acknowledgement"
  | "file_upload"
  | "approval"
  | "booking"
  | "esign";

interface Attachment {
  id: string;
  name: string;
  type: string;
  size?: number;
  url?: string;
  uploadedAt?: Date | string;
  uploadedBy?: string;
}

interface ActionDetailsProps {
  /** Task title */
  title: string;
  /** Task type */
  type: TaskType;
  /** Task description */
  description?: string;
  /** Whether it's the user's turn */
  isYourTurn?: boolean;
  /** Whether task is completed */
  isCompleted?: boolean;
  /** Section this task belongs to */
  sectionTitle?: string;
  /** Attachments */
  attachments?: Attachment[];
  /** Progress info */
  progress?: {
    completedSteps: number;
    totalSteps: number;
  };
  /** Activity entries */
  activityEntries?: AuditEntry[];
  /** Current user ID for activity feed */
  currentUserId?: string;
  /** Due date */
  dueDate?: Date | string;
  /** Assignees */
  assignees?: Array<{ id: string; name: string }>;
  /** Callback when close button clicked */
  onClose?: () => void;
  /** Callback when primary action clicked */
  onPrimaryAction?: () => void;
  /** Primary action label (defaults based on type) */
  primaryActionLabel?: string;
  /** Whether loading */
  isLoading?: boolean;
  /** Optional class name */
  className?: string;
}

// Type-specific configuration
const typeConfig: Record<
  TaskType,
  { icon: LucideIcon; color: string; defaultAction: string }
> = {
  form: {
    icon: FileText,
    color: "text-teal-600 dark:text-teal-400",
    defaultAction: "Fill Form",
  },
  acknowledgement: {
    icon: CheckSquare,
    color: "text-amber-700 dark:text-amber-400",
    defaultAction: "Acknowledge",
  },
  file_upload: {
    icon: Upload,
    color: "text-purple-600 dark:text-purple-400",
    defaultAction: "Upload File",
  },
  approval: {
    icon: ThumbsUp,
    color: "text-blue-600 dark:text-blue-400",
    defaultAction: "Review",
  },
  booking: {
    icon: Calendar,
    color: "text-orange-600 dark:text-orange-400",
    defaultAction: "Schedule",
  },
  esign: {
    icon: FileSignature,
    color: "text-indigo-600 dark:text-indigo-400",
    defaultAction: "Sign Document",
  },
};

/**
 * Action details panel matching Moxo's right panel design
 * Shows task details, attachments, progress, and activity
 */
export function ActionDetails({
  title,
  type,
  description,
  isYourTurn,
  isCompleted,
  sectionTitle,
  attachments = [],
  progress,
  activityEntries = [],
  currentUserId,
  dueDate,
  assignees = [],
  onClose,
  onPrimaryAction,
  primaryActionLabel,
  isLoading,
  className,
}: ActionDetailsProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Format due date
  const formattedDueDate = dueDate
    ? typeof dueDate === "string"
      ? new Date(dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
    : null;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">{title}</h2>
              {sectionTitle && (
                <p className="text-xs text-muted-foreground">{sectionTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isYourTurn && !isCompleted && (
              <Badge
                variant="default"
                className="bg-green-500 hover:bg-green-500 text-white text-xs"
              >
                Your Turn
              </Badge>
            )}
            {isCompleted && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs"
              >
                Complete
              </Badge>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="details" className="flex h-full flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
            <TabsTrigger value="details" className="text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              Activity
              {activityEntries.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  ({activityEntries.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="details" className="mt-0 p-4 space-y-6">
              {/* Description */}
              {description && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-foreground">{description}</p>
                </div>
              )}

              {/* Due Date */}
              {formattedDueDate && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Due Date
                  </h3>
                  <p className="text-sm text-foreground">{formattedDueDate}</p>
                </div>
              )}

              {/* Assignees */}
              {assignees.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Assignees
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((assignee) => (
                      <Badge key={assignee.id} variant="secondary" className="text-xs">
                        {assignee.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Tracker */}
              {progress && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Progress
                  </h3>
                  <ProgressTracker
                    completedSteps={progress.completedSteps}
                    totalSteps={progress.totalSteps}
                  />
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    <Paperclip className="inline h-3 w-3 mr-1" />
                    Attachments ({attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <AttachmentItem key={attachment.id} attachment={attachment} />
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Action */}
              {!isCompleted && onPrimaryAction && (
                <div className="pt-2">
                  <Button
                    className="w-full"
                    onClick={onPrimaryAction}
                    disabled={isLoading}
                  >
                    {primaryActionLabel || config.defaultAction}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-0 h-full">
              <ActivityFeed
                entries={activityEntries}
                currentUserId={currentUserId}
                compact
                groupByDate
                className="h-full"
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Attachment item component
 */
function AttachmentItem({ attachment }: { attachment: Attachment }) {
  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-2 hover:bg-muted/50 transition-colors">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">
          {attachment.type}
          {attachment.size && ` • ${formatSize(attachment.size)}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {attachment.url && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={attachment.url} download>
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export type { ActionDetailsProps, Attachment };
