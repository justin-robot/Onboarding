"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Textarea } from "@repo/design/components/ui/textarea";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { UserAvatar } from "@repo/design/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design/components/ui/popover";
import { Loader2, Send, MoreVertical, Trash2, Paperclip, Smile, X, FileText } from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { isEdited } from "@repo/design/lib/date-utils";

// Common emoji categories for quick access
const EMOJI_CATEGORIES = [
  { name: "Smileys", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "😘", "😗"] },
  { name: "Gestures", emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👋", "🖐️", "✋", "👏", "🙌", "🤝", "🙏", "💪"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"] },
  { name: "Objects", emojis: ["⭐", "🔥", "✨", "💯", "✅", "❌", "⚡", "💡", "🎉", "🎊", "🎁", "📌", "📍", "🔔", "💬", "📝"] },
];

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userImage?: string;
  content: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface ActivityLog {
  id: string;
  type: "activity";
  eventType: string;
  actorId: string;
  actorName: string;
  isCurrentUser: boolean;
  message: string;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
}

// Combined feed item type
type FeedItem = (Comment & { type: "comment" }) | ActivityLog;

interface CommentSectionProps {
  taskId: string;
  currentUserId: string;
  onCommentCreated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
  className?: string;
  compact?: boolean; // Inline activity-feed style like Moxo
}

export function CommentSection({
  taskId,
  currentUserId,
  onCommentCreated,
  onCommentDeleted,
  className,
  compact = false,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch comments and activities on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch comments and activities in parallel
        const [commentsRes, activitiesRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}/comments`),
          fetch(`/api/tasks/${taskId}/activity`),
        ]);

        if (commentsRes.ok) {
          const data = await commentsRes.json();
          setComments(data.comments || []);
        }

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [taskId]);

  // Merge and sort comments and activities chronologically
  // Filter out comment.created/comment.added events since actual comments are displayed
  const filteredActivities = activities.filter(
    (a) => !["comment.created", "comment.added", "comment.deleted"].includes(a.eventType)
  );

  const feedItems: FeedItem[] = [
    ...comments.map((c) => ({ ...c, type: "comment" as const })),
    ...filteredActivities,
  ].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB; // Oldest first
  });

  // Scroll to bottom when new items arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feedItems.length]);

  // Send comment
  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmedContent }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const newComment = await response.json();

      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) {
          return prev;
        }
        return [...prev, {
          id: newComment.id,
          taskId: newComment.taskId,
          userId: newComment.userId,
          userName: newComment.userName,
          userImage: newComment.userImage,
          content: newComment.content,
          createdAt: newComment.createdAt,
        }];
      });

      setContent("");
      onCommentCreated?.(newComment);
    } catch (err) {
      console.error("Error posting comment:", err);
      toast.error("Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentDeleted?.(commentId);
      toast.success("Comment deleted");
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error("Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
    e.target.value = "";
  };


  // Format date like Moxo: "Friday, 3:34 AM" or "Today, 11:16 PM"
  const formatMoxoDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const time = format(d, "h:mm a");

    if (isToday(d)) {
      return `Today, ${time}`;
    }
    if (isYesterday(d)) {
      return `Yesterday, ${time}`;
    }
    return `${format(d, "EEEE")}, ${time}`;
  };

  // Format date for full mode
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact mode - inline activity feed style like Moxo
  if (compact) {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* Activity/Comment list */}
        <div className="space-y-4 mb-4">
          {feedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          ) : (
            feedItems.map((item) => (
              item.type === "activity" ? (
                <ActivityLogItem
                  key={`activity-${item.id}`}
                  activity={item}
                  formatDate={formatMoxoDate}
                />
              ) : (
                <CompactCommentItem
                  key={`comment-${item.id}`}
                  comment={item}
                  currentUserId={currentUserId}
                  isDeleting={deletingId === item.id}
                  onDelete={() => handleDelete(item.id)}
                  formatDate={formatMoxoDate}
                />
              )
            ))
          )}
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        />

        {/* Selected file preview */}
        {selectedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Moxo-style input with emoji and paperclip on right */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={sending}
          />

          {/* Emoji picker */}
          <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={sending}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <div className="space-y-2">
                {EMOJI_CATEGORIES.map((category) => (
                  <div key={category.name}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {category.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {category.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-lg"
                          onClick={() => handleEmojiSelect(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Full mode - original tabbed view
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Comments list */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to comment on this task
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {feedItems.map((item) => (
              item.type === "activity" ? (
                <ActivityLogItem
                  key={`activity-${item.id}`}
                  activity={item}
                  formatDate={formatDate}
                />
              ) : (
                <CommentItem
                  key={`comment-${item.id}`}
                  comment={item}
                  currentUserId={currentUserId}
                  isDeleting={deletingId === item.id}
                  onDelete={() => handleDelete(item.id)}
                  formatDate={formatDate}
                />
              )
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Comment input */}
      <div className="flex-shrink-0 border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            className="min-h-[60px] resize-none"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="shrink-0 self-end"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press {typeof navigator !== "undefined" && navigator?.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
        </p>
      </div>
    </div>
  );
}

// Activity log item - blue square bullet style
function ActivityLogItem({
  activity,
  formatDate,
}: {
  activity: ActivityLog;
  formatDate: (date: Date | string) => string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-sm bg-primary mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{activity.message}</p>
        <p className="text-xs text-muted-foreground">{formatDate(activity.createdAt)}</p>
      </div>
    </div>
  );
}

// Individual comment item (full mode)
function CommentItem({
  comment,
  currentUserId,
  isDeleting,
  onDelete,
  formatDate,
}: {
  comment: Comment;
  currentUserId: string;
  isDeleting: boolean;
  onDelete: () => void;
  formatDate: (date: Date | string) => string;
}) {
  const isOwn = comment.userId === currentUserId;

  return (
    <div className="flex gap-3 group">
      <UserAvatar
        name={comment.userName}
        userId={comment.userId}
        imageUrl={comment.userImage}
        size="md"
        isCurrentUser={isOwn}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {comment.userName || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)}
            {comment.updatedAt && isEdited(comment.createdAt, comment.updatedAt) && (
              <span className="ml-1 italic">(edited)</span>
            )}
          </span>
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MoreVertical className="h-3 w-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// Compact comment item - for user messages in activity feed
function CompactCommentItem({
  comment,
  currentUserId,
  isDeleting,
  onDelete,
  formatDate,
}: {
  comment: Comment;
  currentUserId: string;
  isDeleting: boolean;
  onDelete: () => void;
  formatDate: (date: Date | string) => string;
}) {
  const isOwn = comment.userId === currentUserId;

  return (
    <div className="flex items-start gap-3 group">
      <UserAvatar
        name={comment.userName}
        userId={comment.userId}
        imageUrl={comment.userImage}
        size="md"
        isCurrentUser={isOwn}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.userName || "Unknown"}</span>
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MoreVertical className="h-3 w-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-foreground">{comment.content}</p>
      </div>
    </div>
  );
}

// Export handler types for real-time integration
export type CommentCreatedHandler = (comment: Comment) => void;
export type CommentDeletedHandler = (commentId: string) => void;
