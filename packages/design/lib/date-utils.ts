import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";

/**
 * Format a date as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a date for task cards (short relative time)
 * Shows "Just now" for < 1 min, "Xm ago" for minutes, "Xh ago" for hours, then date
 */
export function formatTaskTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = differenceInSeconds(new Date(), d);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return format(d, "MMM d");
}

/**
 * Format a date for task details panel (full date with time)
 */
export function formatFullTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Check if a message/comment has been edited
 * Returns true if updatedAt is more than 1 second after createdAt
 */
export function isEdited(
  createdAt: Date | string,
  updatedAt: Date | string
): boolean {
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const updated =
    typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  return differenceInSeconds(updated, created) > 1;
}

/**
 * Format time for chat messages (h:mm a)
 */
export function formatMessageTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}
