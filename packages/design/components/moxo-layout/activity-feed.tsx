"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { UserAvatar } from "../ui/user-avatar";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  CheckCircle,
  FileText,
  Upload,
  UserPlus,
  Send,
  Edit,
  Trash,
  MessageSquare,
  Clock,
  Eye,
  FileSignature,
  CalendarCheck,
  ChevronDown,
} from "lucide-react";

// Audit event types
type AuditEventType =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.reopened"
  | "task.deleted"
  | "task.assigned"
  | "task.unassigned"
  | "form.submitted"
  | "form.draft_saved"
  | "file.uploaded"
  | "file.deleted"
  | "file.downloaded"
  | "approval.approved"
  | "approval.rejected"
  | "approval.requested"
  | "acknowledgement.completed"
  | "booking.scheduled"
  | "booking.cancelled"
  | "esign.sent"
  | "esign.viewed"
  | "esign.signed"
  | "esign.completed"
  | "esign.declined"
  | "workspace.member_added"
  | "workspace.member_removed"
  | "workspace.invitation_sent"
  | "comment.created"
  | "comment.deleted";

interface AuditEntry {
  id: string;
  eventType: AuditEventType | string;
  actorId: string;
  actorName?: string;
  actorAvatarUrl?: string;
  taskId?: string;
  taskTitle?: string;
  sectionTitle?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
}

interface ActivityFeedProps {
  /** Audit log entries to display */
  entries: AuditEntry[];
  /** Current user ID for perspective-aware phrasing */
  currentUserId?: string;
  /** Whether more entries are available */
  hasMore?: boolean;
  /** Callback to load more entries */
  onLoadMore?: () => void;
  /** Whether loading more */
  isLoadingMore?: boolean;
  /** Whether initial load is happening */
  isLoading?: boolean;
  /** Optional class name */
  className?: string;
  /** Header title (defaults to "Activity") */
  title?: string;
  /** Whether to group entries by date */
  groupByDate?: boolean;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

/**
 * Group entries by date
 */
function groupEntriesByDate(entries: AuditEntry[]): Map<string, AuditEntry[]> {
  const groups = new Map<string, AuditEntry[]>();

  entries.forEach((entry) => {
    const date = typeof entry.createdAt === "string"
      ? new Date(entry.createdAt)
      : entry.createdAt;

    let dateKey: string;
    if (isToday(date)) {
      dateKey = "Today";
    } else if (isYesterday(date)) {
      dateKey = "Yesterday";
    } else {
      dateKey = format(date, "MMM d, yyyy");
    }

    const existing = groups.get(dateKey) || [];
    groups.set(dateKey, [...existing, entry]);
  });

  return groups;
}

/**
 * Activity feed displaying audit log entries
 * Matches Moxo's Action Details panel activity log
 */
export function ActivityFeed({
  entries,
  currentUserId,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isLoading,
  className,
  title = "Activity",
  groupByDate = true,
  compact = false,
}: ActivityFeedProps) {
  const groupedEntries = groupByDate ? groupEntriesByDate(entries) : null;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-border",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}>
        <h2 className={cn(
          "font-semibold text-foreground",
          compact ? "text-xs uppercase tracking-wider text-muted-foreground" : "text-sm"
        )}>
          {title}
        </h2>
        {entries.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? "event" : "events"}
          </span>
        )}
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className={cn("space-y-1", compact ? "p-2" : "p-3")}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <ActivityItemSkeleton key={i} compact={compact} />
            ))
          ) : entries.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              No activity yet
            </div>
          ) : groupedEntries ? (
            <>
              {Array.from(groupedEntries.entries()).map(([dateLabel, dateEntries]) => (
                <div key={dateLabel} className="space-y-1">
                  <div className={cn(
                    "sticky top-0 bg-background/95 backdrop-blur-sm",
                    compact ? "py-1" : "py-1.5"
                  )}>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {dateLabel}
                    </span>
                  </div>
                  {dateEntries.map((entry) => (
                    <ActivityItem
                      key={entry.id}
                      entry={entry}
                      isCurrentUser={entry.actorId === currentUserId}
                      compact={compact}
                    />
                  ))}
                </div>
              ))}
            </>
          ) : (
            entries.map((entry) => (
              <ActivityItem
                key={entry.id}
                entry={entry}
                isCurrentUser={entry.actorId === currentUserId}
                compact={compact}
              />
            ))
          )}

          {hasMore && (
            <div className="py-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-xs"
              >
                <ChevronDown className="mr-1 h-3 w-3" />
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ActivityItemProps {
  entry: AuditEntry;
  isCurrentUser?: boolean;
  compact?: boolean;
}

function ActivityItem({ entry, isCurrentUser, compact }: ActivityItemProps) {
  const { icon, color } = getEventIcon(entry.eventType);
  const description = getEventDescription(entry, isCurrentUser);
  const timestamp = typeof entry.createdAt === "string"
    ? new Date(entry.createdAt)
    : entry.createdAt;

  if (compact) {
    const { icon: compactIcon, color: compactColor } = getEventIcon(entry.eventType, "compact");
    return (
      <div className="flex gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/50 transition-colors">
        {/* Icon */}
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            compactColor
          )}
        >
          {compactIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground leading-tight">{description}</p>
          <p className="text-[10px] text-muted-foreground">
            {format(timestamp, "h:mm a")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 rounded-md px-2 py-2 hover:bg-muted/50 transition-colors">
      {/* Avatar or Icon */}
      {entry.actorAvatarUrl || entry.actorName ? (
        <UserAvatar
          name={entry.actorName}
          userId={entry.actorId}
          imageUrl={entry.actorAvatarUrl}
          size="md"
          className="shrink-0"
        />
      ) : (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            color
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{description}</p>
        {(entry.taskTitle || entry.sectionTitle) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {entry.sectionTitle && <span>{entry.sectionTitle} • </span>}
            {entry.taskTitle}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function ActivityItemSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex gap-2 px-1.5 py-1.5">
        <div className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-2 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-2 py-2">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function getEventIcon(eventType: string, size: "normal" | "compact" = "normal"): { icon: React.ReactNode; color: string } {
  const iconClass = size === "compact" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";

  switch (eventType) {
    case "task.completed":
    case "acknowledgement.completed":
      return {
        icon: <CheckCircle className={iconClass} />,
        color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      };
    case "form.submitted":
      return {
        icon: <FileText className={iconClass} />,
        color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      };
    case "file.uploaded":
      return {
        icon: <Upload className={iconClass} />,
        color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      };
    case "task.assigned":
    case "workspace.member_added":
      return {
        icon: <UserPlus className={iconClass} />,
        color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
      };
    case "esign.sent":
    case "workspace.invitation_sent":
      return {
        icon: <Send className={iconClass} />,
        color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      };
    case "esign.viewed":
      return {
        icon: <Eye className={iconClass} />,
        color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
      };
    case "esign.signed":
    case "esign.completed":
      return {
        icon: <FileSignature className={iconClass} />,
        color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      };
    case "booking.scheduled":
      return {
        icon: <CalendarCheck className={iconClass} />,
        color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
      };
    case "approval.approved":
      return {
        icon: <CheckCircle className={iconClass} />,
        color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
      };
    case "approval.rejected":
    case "esign.declined":
      return {
        icon: <Trash className={iconClass} />,
        color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      };
    case "comment.created":
      return {
        icon: <MessageSquare className={iconClass} />,
        color: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
      };
    case "task.updated":
      return {
        icon: <Edit className={iconClass} />,
        color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
      };
    case "task.deleted":
    case "file.deleted":
    case "comment.deleted":
      return {
        icon: <Trash className={iconClass} />,
        color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
      };
    default:
      return {
        icon: <Clock className={iconClass} />,
        color: "bg-muted text-muted-foreground",
      };
  }
}

function getEventDescription(entry: AuditEntry, isCurrentUser?: boolean): string {
  const actor = isCurrentUser ? "You" : entry.actorName || "Someone";

  switch (entry.eventType) {
    case "task.created":
      return `${actor} created a task`;
    case "task.updated":
      return `${actor} updated a task`;
    case "task.completed":
      return `${actor} completed a task`;
    case "task.reopened":
      return `${actor} reopened a task`;
    case "task.deleted":
      return `${actor} deleted a task`;
    case "task.assigned":
      return `${actor} assigned a task`;
    case "task.unassigned":
      return `${actor} unassigned from a task`;
    case "form.submitted":
      return `${actor} submitted a form`;
    case "form.draft_saved":
      return `${actor} saved a draft`;
    case "file.uploaded":
      return `${actor} uploaded a file`;
    case "file.deleted":
      return `${actor} deleted a file`;
    case "file.downloaded":
      return `${actor} downloaded a file`;
    case "approval.approved":
      return `${actor} approved`;
    case "approval.rejected":
      return `${actor} rejected`;
    case "approval.requested":
      return `${actor} requested approval`;
    case "acknowledgement.completed":
      return `${actor} acknowledged`;
    case "booking.scheduled":
      return `${actor} scheduled a meeting`;
    case "booking.cancelled":
      return `${actor} cancelled a meeting`;
    case "esign.sent":
      return `${actor} sent document for signature`;
    case "esign.viewed":
      return `Document was viewed`;
    case "esign.signed":
      return `Document was signed`;
    case "esign.completed":
      return `Document signing completed`;
    case "esign.declined":
      return `Document was declined`;
    case "workspace.member_added":
      return `${actor} added a member`;
    case "workspace.member_removed":
      return `${actor} removed a member`;
    case "workspace.invitation_sent":
      return `${actor} sent an invitation`;
    case "comment.created":
      return `${actor} added a comment`;
    case "comment.deleted":
      return `${actor} deleted a comment`;
    default:
      return `${actor} performed an action`;
  }
}

export type { AuditEntry, ActivityFeedProps, AuditEventType };
