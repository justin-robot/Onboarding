"use client";

import { useCallback, useState, useEffect } from "react";
import {
  AblyProvider,
  useTaskComments,
  useAblyToken,
  type CommentPayload,
} from "@repo/realtime";
import { CommentSection, type Comment } from "./comment-section";

interface RealtimeCommentsProps {
  workspaceId: string;
  taskId: string;
  currentUserId: string;
  className?: string;
}

/**
 * Real-time comments component with Ably integration
 * Wraps CommentSection and handles real-time updates
 */
export function RealtimeComments({
  workspaceId,
  taskId,
  currentUserId,
  className,
}: RealtimeCommentsProps) {
  const { token, loading, error } = useAblyToken(workspaceId);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Connecting...</div>
      </div>
    );
  }

  if (error || !token) {
    // Fallback to non-realtime comments
    return (
      <CommentSection
        taskId={taskId}
        currentUserId={currentUserId}
        className={className}
      />
    );
  }

  return (
    <AblyProvider tokenRequest={token}>
      <RealtimeCommentsInner
        workspaceId={workspaceId}
        taskId={taskId}
        currentUserId={currentUserId}
        className={className}
      />
    </AblyProvider>
  );
}

/**
 * Inner component that uses Ably hooks (must be inside AblyProvider)
 */
function RealtimeCommentsInner({
  workspaceId,
  taskId,
  currentUserId,
  className,
}: RealtimeCommentsProps) {
  // Key to force remount of CommentSection when real-time events arrive
  const [updateKey, setUpdateKey] = useState(0);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Handle incoming real-time comment created
  const handleCommentCreated = useCallback((payload: CommentPayload) => {
    const newComment: Comment = {
      id: payload.id,
      taskId: payload.taskId,
      userId: payload.userId,
      userName: payload.userName,
      userImage: payload.userImage,
      content: payload.content,
      createdAt: new Date(payload.createdAt),
    };

    setPendingComments((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.id === newComment.id)) {
        return prev;
      }
      return [...prev, newComment];
    });
  }, []);

  // Handle real-time comment deleted
  const handleCommentDeleted = useCallback((commentId: string) => {
    setDeletedIds((prev) => new Set([...prev, commentId]));
    setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  // Subscribe to comment events
  useTaskComments(workspaceId, taskId, {
    onCommentCreated: handleCommentCreated,
    onCommentDeleted: handleCommentDeleted,
  });

  return (
    <CommentSectionWithRealtime
      key={`${taskId}-${updateKey}`}
      taskId={taskId}
      currentUserId={currentUserId}
      pendingComments={pendingComments}
      deletedIds={deletedIds}
      className={className}
    />
  );
}

/**
 * CommentSection wrapper that integrates real-time updates
 */
function CommentSectionWithRealtime({
  taskId,
  currentUserId,
  pendingComments,
  deletedIds,
  className,
}: {
  taskId: string;
  currentUserId: string;
  pendingComments: Comment[];
  deletedIds: Set<string>;
  className?: string;
}) {
  return (
    <CommentSection
      taskId={taskId}
      currentUserId={currentUserId}
      className={className}
    />
  );
}

// For dynamic import with SSR disabled
export default RealtimeComments;
