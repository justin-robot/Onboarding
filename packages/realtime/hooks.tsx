"use client";

import { useCallback, useEffect, useState } from "react";
import type Ably from "ably";
import { useAbly, useAblyEvent } from "./client";

// Channel name patterns (matching server-side ably.ts)
export const CHANNELS = {
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,
  workspaceChat: (workspaceId: string) => `workspace:${workspaceId}:chat`,
  user: (userId: string) => `user:${userId}`,
} as const;

// Event types for workspace channel
export const WORKSPACE_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  TASK_COMPLETED: "task:completed",
  TASK_ASSIGNED: "task:assigned",
  SECTION_CREATED: "section:created",
  SECTION_UPDATED: "section:updated",
  SECTION_DELETED: "section:deleted",
  SECTION_STATUS_CHANGED: "section:status_changed",
  FILE_UPLOADED: "file:uploaded",
  FILE_DELETED: "file:deleted",
  MEMBER_ADDED: "member:added",
  MEMBER_REMOVED: "member:removed",
  COMMENT_CREATED: "comment.created",
  COMMENT_DELETED: "comment.deleted",
  AUDIT_CREATED: "audit:created",
} as const;

// Event types for chat channel
export const CHAT_EVENTS = {
  MESSAGE_SENT: "message:sent",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  TYPING_STARTED: "typing:started",
  TYPING_STOPPED: "typing:stopped",
} as const;

export type WorkspaceEventType = (typeof WORKSPACE_EVENTS)[keyof typeof WORKSPACE_EVENTS];
export type ChatEventType = (typeof CHAT_EVENTS)[keyof typeof CHAT_EVENTS];

// Message payload from chat events
export interface ChatMessagePayload {
  id: string;
  type: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  createdAt: string;
  attachmentIds?: string[];
  referencedTaskId?: string;
  referencedFileId?: string;
}

// Task payload from workspace events
export interface TaskPayload {
  id: string;
  title: string;
  type: string;
  status: string;
  sectionId: string;
  position: number;
}

// Typing indicator payload
export interface TypingPayload {
  userId: string;
  userName: string;
}

// Comment payload from workspace events
export interface CommentPayload {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  userImage?: string;
  content: string;
  createdAt: string;
}

// Audit log payload from workspace events
export interface AuditPayload {
  id: string;
  eventType: string;
  actorId: string;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// File payload from workspace events
export interface FilePayload {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  sourceType: string;
  sourceTaskId?: string | null;
  uploadedBy: string;
}

// Member payload from workspace events
export interface MemberPayload {
  memberId: string;
  userId: string;
  role: string;
  name?: string;
  email?: string;
}

// Section payload from workspace events
export interface SectionPayload {
  sectionId: string;
  title?: string;
  position?: number;
  status?: string;
  completedCount?: number;
  totalCount?: number;
}

/**
 * Hook to subscribe to workspace chat messages
 */
export function useWorkspaceChat(
  workspaceId: string,
  callbacks: {
    onMessage?: (message: ChatMessagePayload) => void;
    onMessageUpdated?: (message: ChatMessagePayload) => void;
    onMessageDeleted?: (messageId: string) => void;
    onTypingStarted?: (user: TypingPayload) => void;
    onTypingStopped?: (user: TypingPayload) => void;
  }
) {
  const ably = useAbly();
  const channelName = CHANNELS.workspaceChat(workspaceId);

  useEffect(() => {
    const channel = ably.channels.get(channelName);

    const handleMessage = (message: Ably.Message) => {
      switch (message.name) {
        case CHAT_EVENTS.MESSAGE_SENT:
          callbacks.onMessage?.(message.data as ChatMessagePayload);
          break;
        case CHAT_EVENTS.MESSAGE_UPDATED:
          callbacks.onMessageUpdated?.(message.data as ChatMessagePayload);
          break;
        case CHAT_EVENTS.MESSAGE_DELETED:
          callbacks.onMessageDeleted?.(message.data as string);
          break;
        case CHAT_EVENTS.TYPING_STARTED:
          callbacks.onTypingStarted?.(message.data as TypingPayload);
          break;
        case CHAT_EVENTS.TYPING_STOPPED:
          callbacks.onTypingStopped?.(message.data as TypingPayload);
          break;
      }
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
    };
  }, [ably, channelName, callbacks]);

  // Publish typing indicator
  const publishTyping = useCallback(
    async (isTyping: boolean, user: TypingPayload) => {
      const channel = ably.channels.get(channelName);
      const event = isTyping ? CHAT_EVENTS.TYPING_STARTED : CHAT_EVENTS.TYPING_STOPPED;
      await channel.publish(event, user);
    },
    [ably, channelName]
  );

  return { publishTyping };
}

/**
 * Hook to subscribe to task comment events
 * Filters workspace events to only handle comments for a specific task
 */
export function useTaskComments(
  workspaceId: string,
  taskId: string,
  callbacks: {
    onCommentCreated?: (comment: CommentPayload) => void;
    onCommentDeleted?: (commentId: string) => void;
  }
) {
  const ably = useAbly();
  const channelName = CHANNELS.workspace(workspaceId);

  useEffect(() => {
    const channel = ably.channels.get(channelName);

    const handleMessage = (message: Ably.Message) => {
      switch (message.name) {
        case WORKSPACE_EVENTS.COMMENT_CREATED: {
          const comment = message.data as CommentPayload;
          // Only handle comments for this specific task
          if (comment.taskId === taskId) {
            callbacks.onCommentCreated?.(comment);
          }
          break;
        }
        case WORKSPACE_EVENTS.COMMENT_DELETED: {
          const data = message.data as { id: string; taskId: string };
          // Only handle deletions for this specific task
          if (data.taskId === taskId) {
            callbacks.onCommentDeleted?.(data.id);
          }
          break;
        }
      }
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
    };
  }, [ably, channelName, taskId, callbacks]);
}

/**
 * Hook to subscribe to workspace events (tasks, sections, files, members, audit)
 */
export function useWorkspaceEvents(
  workspaceId: string,
  callbacks: {
    onTaskCreated?: (task: TaskPayload) => void;
    onTaskUpdated?: (task: TaskPayload) => void;
    onTaskDeleted?: (taskId: string) => void;
    onTaskCompleted?: (task: TaskPayload) => void;
    onSectionCreated?: (section: SectionPayload) => void;
    onSectionUpdated?: (section: SectionPayload) => void;
    onSectionDeleted?: (sectionId: string) => void;
    onSectionStatusChanged?: (section: SectionPayload) => void;
    onFileUploaded?: (file: FilePayload) => void;
    onFileDeleted?: (data: { fileId: string; sourceTaskId?: string | null }) => void;
    onMemberAdded?: (member: MemberPayload) => void;
    onMemberRemoved?: (data: { userId: string }) => void;
    onAuditCreated?: (audit: AuditPayload) => void;
    onAnyEvent?: () => void; // Called on any event for general refresh
  }
) {
  const ably = useAbly();
  const channelName = CHANNELS.workspace(workspaceId);

  useEffect(() => {
    const channel = ably.channels.get(channelName);

    const handleMessage = (message: Ably.Message) => {
      // Always trigger onAnyEvent
      callbacks.onAnyEvent?.();

      switch (message.name) {
        case WORKSPACE_EVENTS.TASK_CREATED:
          callbacks.onTaskCreated?.(message.data as TaskPayload);
          break;
        case WORKSPACE_EVENTS.TASK_UPDATED:
          callbacks.onTaskUpdated?.(message.data as TaskPayload);
          break;
        case WORKSPACE_EVENTS.TASK_DELETED:
          callbacks.onTaskDeleted?.(message.data as string);
          break;
        case WORKSPACE_EVENTS.TASK_COMPLETED:
          callbacks.onTaskCompleted?.(message.data as TaskPayload);
          break;
        case WORKSPACE_EVENTS.SECTION_CREATED:
          callbacks.onSectionCreated?.(message.data as SectionPayload);
          break;
        case WORKSPACE_EVENTS.SECTION_UPDATED:
          callbacks.onSectionUpdated?.(message.data as SectionPayload);
          break;
        case WORKSPACE_EVENTS.SECTION_DELETED:
          callbacks.onSectionDeleted?.(message.data as string);
          break;
        case WORKSPACE_EVENTS.SECTION_STATUS_CHANGED:
          callbacks.onSectionStatusChanged?.(message.data as SectionPayload);
          break;
        case WORKSPACE_EVENTS.FILE_UPLOADED:
          callbacks.onFileUploaded?.(message.data as FilePayload);
          break;
        case WORKSPACE_EVENTS.FILE_DELETED:
          callbacks.onFileDeleted?.(message.data as { fileId: string; sourceTaskId?: string | null });
          break;
        case WORKSPACE_EVENTS.MEMBER_ADDED:
          callbacks.onMemberAdded?.(message.data as MemberPayload);
          break;
        case WORKSPACE_EVENTS.MEMBER_REMOVED:
          callbacks.onMemberRemoved?.(message.data as { userId: string });
          break;
        case WORKSPACE_EVENTS.AUDIT_CREATED:
          callbacks.onAuditCreated?.(message.data as AuditPayload);
          break;
      }
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
    };
  }, [ably, channelName, callbacks]);
}

/**
 * Hook to subscribe to audit log events for real-time activity feed
 */
export function useAuditEvents(
  workspaceId: string,
  onAuditCreated: (audit: AuditPayload) => void
) {
  const ably = useAbly();
  const channelName = CHANNELS.workspace(workspaceId);

  useEffect(() => {
    const channel = ably.channels.get(channelName);

    const handleMessage = (message: Ably.Message) => {
      if (message.name === WORKSPACE_EVENTS.AUDIT_CREATED) {
        onAuditCreated(message.data as AuditPayload);
      }
    };

    channel.subscribe(handleMessage);

    return () => {
      channel.unsubscribe(handleMessage);
    };
  }, [ably, channelName, onAuditCreated]);
}

/**
 * Hook to manage connection state
 */
export function useAblyConnectionState() {
  const ably = useAbly();
  const [connectionState, setConnectionState] = useState<string>(ably.connection.state);

  useEffect(() => {
    const handleStateChange = (stateChange: Ably.ConnectionStateChange) => {
      setConnectionState(stateChange.current);
    };

    ably.connection.on(handleStateChange);

    return () => {
      ably.connection.off(handleStateChange);
    };
  }, [ably]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
    isDisconnected: connectionState === "disconnected" || connectionState === "suspended",
  };
}

// TokenRequest type matching Ably's structure
type TokenRequestData = {
  keyName?: string;
  clientId?: string;
  timestamp?: number;
  nonce?: string;
  mac?: string;
  capability?: string;
  ttl?: number;
};

/**
 * Hook to fetch and cache Ably token
 */
export function useAblyToken(workspaceId: string) {
  const [token, setToken] = useState<TokenRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/realtime/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        });

        if (!response.ok) {
          throw new Error("Failed to get realtime token");
        }

        const tokenData = await response.json();
        setToken(tokenData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [workspaceId]);

  return { token, loading, error };
}
