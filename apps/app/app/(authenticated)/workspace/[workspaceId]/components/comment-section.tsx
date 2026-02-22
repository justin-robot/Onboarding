"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@repo/design/components/ui/button";
import { Textarea } from "@repo/design/components/ui/textarea";
import { ScrollArea } from "@repo/design/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design/components/ui/dropdown-menu";
import { Loader2, Send, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@repo/design/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { isEdited } from "@repo/design/lib/date-utils";

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

interface CommentSectionProps {
  taskId: string;
  currentUserId: string;
  onCommentCreated?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
  className?: string;
}

export function CommentSection({
  taskId,
  currentUserId,
  onCommentCreated,
  onCommentDeleted,
  className,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch comments on mount
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}/comments`);
        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }
        const data = await response.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error("Error fetching comments:", err);
        toast.error("Failed to load comments");
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [taskId]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Handle real-time comment created
  const handleRealtimeCommentCreated = useCallback((comment: Comment) => {
    setComments((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.id === comment.id)) {
        return prev;
      }
      return [...prev, comment];
    });
  }, []);

  // Handle real-time comment deleted
  const handleRealtimeCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  // Expose handlers for parent to wire up real-time
  useEffect(() => {
    if (onCommentCreated) {
      // Parent can call this when real-time event arrives
    }
  }, [onCommentCreated]);

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

      // Add optimistically (real-time will also add it, but we check for duplicates)
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

  // Get initials from name
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
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

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Comments list */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to comment on this task
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                isDeleting={deletingId === comment.id}
                onDelete={() => handleDelete(comment.id)}
                getInitials={getInitials}
                formatDate={formatDate}
              />
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
          Press {navigator?.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
        </p>
      </div>
    </div>
  );
}

// Individual comment item
function CommentItem({
  comment,
  currentUserId,
  isDeleting,
  onDelete,
  getInitials,
  formatDate,
}: {
  comment: Comment;
  currentUserId: string;
  isDeleting: boolean;
  onDelete: () => void;
  getInitials: (name?: string) => string;
  formatDate: (date: Date | string) => string;
}) {
  const isOwn = comment.userId === currentUserId;

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.userImage} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.userName)}
        </AvatarFallback>
      </Avatar>
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

// Export handler types for real-time integration
export type CommentCreatedHandler = (comment: Comment) => void;
export type CommentDeletedHandler = (commentId: string) => void;
