"use client";

import { useEffect, useCallback } from "react";
import {
  AblyProvider,
  useWorkspaceEvents,
  useAblyToken,
} from "@repo/realtime";

interface RealtimeWorkspaceEventsProps {
  workspaceId: string;
  onWorkspaceUpdate: () => void;
}

/**
 * Component that subscribes to workspace events and triggers refresh on changes
 * Renders nothing - just handles real-time subscriptions
 */
export function RealtimeWorkspaceEvents({
  workspaceId,
  onWorkspaceUpdate,
}: RealtimeWorkspaceEventsProps) {
  const { token, loading, error } = useAblyToken(workspaceId);

  if (loading || error || !token) {
    // Silently fail - workspace will still work without real-time updates
    return null;
  }

  return (
    <AblyProvider tokenRequest={token}>
      <WorkspaceEventsSubscriber
        workspaceId={workspaceId}
        onWorkspaceUpdate={onWorkspaceUpdate}
      />
    </AblyProvider>
  );
}

/**
 * Inner component that uses Ably hooks (must be inside AblyProvider)
 */
function WorkspaceEventsSubscriber({
  workspaceId,
  onWorkspaceUpdate,
}: RealtimeWorkspaceEventsProps) {
  // Debounce refresh to avoid too many refreshes in quick succession
  const debouncedRefresh = useCallback(() => {
    // Simple debounce using setTimeout
    const timeoutId = setTimeout(() => {
      onWorkspaceUpdate();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [onWorkspaceUpdate]);

  // Subscribe to all workspace events
  useWorkspaceEvents(workspaceId, {
    onTaskCreated: () => {
      console.log("[Realtime] Task created");
      onWorkspaceUpdate();
    },
    onTaskUpdated: () => {
      console.log("[Realtime] Task updated");
      onWorkspaceUpdate();
    },
    onTaskCompleted: () => {
      console.log("[Realtime] Task completed");
      onWorkspaceUpdate();
    },
    onTaskDeleted: () => {
      console.log("[Realtime] Task deleted");
      onWorkspaceUpdate();
    },
    onSectionCreated: () => {
      console.log("[Realtime] Section created");
      onWorkspaceUpdate();
    },
    onSectionUpdated: () => {
      console.log("[Realtime] Section updated");
      onWorkspaceUpdate();
    },
    onSectionDeleted: () => {
      console.log("[Realtime] Section deleted");
      onWorkspaceUpdate();
    },
    onFileUploaded: () => {
      console.log("[Realtime] File uploaded");
      onWorkspaceUpdate();
    },
    onFileDeleted: () => {
      console.log("[Realtime] File deleted");
      onWorkspaceUpdate();
    },
    onMemberAdded: () => {
      console.log("[Realtime] Member added");
      onWorkspaceUpdate();
    },
    onMemberRemoved: () => {
      console.log("[Realtime] Member removed");
      onWorkspaceUpdate();
    },
  });

  // This component renders nothing
  return null;
}
